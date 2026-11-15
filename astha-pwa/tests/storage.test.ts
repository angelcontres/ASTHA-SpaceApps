// Fase 2 — src/storage/: (1) RBAC criptográfico, (2) SEU/cuarentena, (3) bitácora inmutable,
// (4) convergencia CRDT con relojes desfasados; más telemetría, exportación firmada y sync.
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CrdtState, GSet, HybridClock, LwwMap, PNCounter, compareHlc, deltaFor, encodeHlc, type Op, type OpBody } from '../src/storage/crdt';
import {
  decryptJson, encryptJson, generateDeviceIdentity, provisionKeyring, unlockKeyring, WrongPinError,
  type DeviceIdentity, type Keyring,
} from '../src/storage/crypto';
import { buildPayload, parseImport, serialize, signExport, verifyExport, compress } from '../src/storage/exportBuilder';
import { AsthaDb, flipBit, type Envelope } from '../src/storage/idb';
import { checkEnvelope, IntegrityGuard, sealEnvelope, WriteVerifyError } from '../src/storage/integrity';
import { Ledger } from '../src/storage/ledger';
import { hubUrlFor, SyncClient, type WebSocketLike } from '../src/storage/syncClient';
import {
  buildView, generateDataset, manualEntry, resetOp, scenarioOps, SimClock, SYNTHETIC, symptomToggle,
} from '../src/storage/telemetrySources';

const CREW = SYNTHETIC.crew.map((c) => ({ personId: c.id, pin: c.pin }));
const CMO = SYNTHETIC.crew.find((c) => c.role === 'cmo')!.id; // C002
const ITER = 1_000; // iteraciones bajas solo para pruebas

let ring: Keyring;
let device: DeviceIdentity;
let db: AsthaDb;

beforeEach(async () => {
  ring ??= await provisionKeyring(CREW, CMO, ITER);
  device ??= await generateDeviceIdentity();
  db = await AsthaDb.open(`astha-test-${Math.random()}`, new IDBFactory());
});

const authorKeys = (author: string) => (author === device.nodeId ? { alg: device.alg, publicJwk: device.publicJwk } : null);

async function seal(body: OpBody, keyRef: string, keys: Map<string, CryptoKey>, clock = new HybridClock(device.nodeId)) {
  const { envelope } = await sealEnvelope(body, clock.tick(), keyRef, keys.get(keyRef)!, device);
  await db.addEnvelope(envelope);
  return envelope;
}

const meas = (crewId: string, sbp = 120): OpBody => ({ t: 'measurement', crewId, day: 120, fields: { sbp }, source: 'manual' });

// ------------------------------------------------------------------ (1)
describe('(1) RBAC criptográfico entre tripulantes y CMO (RNF-SEC-02, ADR-012)', () => {
  it('un astronauta solo desenvuelve su K_t y K_hab', async () => {
    const s = await unlockKeyring(ring, 'C001', '1001');
    expect([...s.keys.keys()].sort()).toEqual(['C001', 'hab']);
  });

  it('el CMO desenvuelve las K_t de toda la tripulación', async () => {
    const s = await unlockKeyring(ring, CMO, '1002');
    expect([...s.keys.keys()].sort()).toEqual(['C001', 'C002', 'C003', 'C004', 'hab']);
  });

  it('las claves desenvueltas no son extraíbles', async () => {
    const s = await unlockKeyring(ring, CMO, '1002');
    for (const k of s.keys.values()) expect(k.extractable).toBe(false);
    expect(ring.habDeviceKey.extractable).toBe(false);
  });

  it('un PIN incorrecto no desenvuelve nada', async () => {
    await expect(unlockKeyring(ring, 'C001', '9999')).rejects.toBeInstanceOf(WrongPinError);
    await expect(unlockKeyring(ring, 'C001', '1003')).rejects.toBeInstanceOf(WrongPinError);
  });

  it('C001 no puede leer los sobres de C003; el CMO sí', async () => {
    const cmo = await unlockKeyring(ring, CMO, '1002');
    await seal(meas('C003', 131), 'C003', cmo.keys);
    const astro = await unlockKeyring(ring, 'C001', '1001');
    const guard = new IntegrityGuard(db, authorKeys);

    const asC001 = await guard.readAll(astro.keys);
    expect(asC001.ops).toHaveLength(0);
    expect(asC001.locked).toBe(1);

    const asCmo = await guard.readAll(cmo.keys);
    expect(asCmo.ops[0].body).toMatchObject({ crewId: 'C003', fields: { sbp: 131 } });
  });

  it('el texto cifrado de una K_t no se descifra con otra K_t', async () => {
    const cmo = await unlockKeyring(ring, CMO, '1002');
    const sealed = await encryptJson(cmo.keys.get('C003')!, { secreto: 1 });
    await expect(decryptJson(cmo.keys.get('C001')!, sealed.iv, sealed.ct)).rejects.toThrow();
  });

  it('IV de 96 bits distinto en cada registro', async () => {
    const s = await unlockKeyring(ring, 'C001', '1001');
    const a = await encryptJson(s.keys.get('C001')!, 1);
    const b = await encryptJson(s.keys.get('C001')!, 1);
    expect(a.iv).toHaveLength(12);
    expect(a.iv).not.toEqual(b.iv);
  });

  it('la K_hab del dispositivo descifra hábitat antes del PIN, pero no datos clínicos', async () => {
    const cmo = await unlockKeyring(ring, CMO, '1002');
    // K_hab envuelta y la copia de dispositivo son la misma clave.
    const sealed = await encryptJson(cmo.keys.get('hab')!, { ppco2: 3.6 });
    expect(await decryptJson(ring.habDeviceKey, sealed.iv, sealed.ct)).toEqual({ ppco2: 3.6 });
    await seal(meas('C001'), 'C001', cmo.keys);
    const locked = await new IntegrityGuard(db, authorKeys).readAll(new Map([['hab', ring.habDeviceKey]]));
    expect(locked.locked).toBe(1);
  });
});

// ------------------------------------------------------------------ (2)
describe('(2) Detección SEU por SHA-256, recuperación y cuarentena (RNF-SEC-03, AC-TECH-06)', () => {
  const sbpOf = (ops: Op[]) => ops.map((o) => (o.body as { fields: { sbp: number } }).fields.sbp).sort();

  it('crea los object stores del modelo físico (ER §2) en ASTHA_EDGE_DB', () => {
    expect(db.storeNames().sort()).toEqual(['audit_chain', 'envelopes_gset', 'envelopes_replica', 'key_vault', 'quarantine']);
  });

  it('el sobre cumple el contrato EncryptedEnvelope de openapi.yaml', async () => {
    const s = await unlockKeyring(ring, 'C001', '1001');
    const e = await seal(meas('C001'), 'C001', s.keys);
    expect(Object.keys(e).sort()).toEqual(['autor', 'ct', 'firma', 'hlc', 'id', 'iv', 'keyRef', 'sha256']);
    expect(e.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(e.hlc).toMatch(/^\d+:\d+:[a-zA-Z0-9-]+$/);
    expect(e.autor).toBe(device.nodeId);
    expect(e.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(atob(e.iv)).toHaveLength(12);
  });

  it('detecta el 100 % de los bit-flips posibles en iv y ct, de forma determinista', async () => {
    const s = await unlockKeyring(ring, 'C001', '1001');
    const { envelope } = await sealEnvelope(meas('C001'), new HybridClock(device.nodeId).tick(), 'C001', s.keys.get('C001')!, device);
    const key = authorKeys(envelope.autor);
    expect(await checkEnvelope(envelope, key)).toEqual({ ok: true });
    let flips = 0;
    for (const field of ['iv', 'ct'] as const) {
      const bits = atob(envelope[field]).length * 8;
      for (let bit = 0; bit < bits; bit++) {
        const r = await checkEnvelope({ ...envelope, [field]: flipBit(envelope[field], field, bit) }, key);
        expect(r.ok, `${field} bit ${bit}`).toBe(false);
        flips++;
      }
    }
    expect(flips).toBeGreaterThan(96 + 128); // todo el IV y al menos la etiqueta GCM
  });

  it('también detecta bit-flips en hlc, autor, keyRef, sha256 y firma', async () => {
    const s = await unlockKeyring(ring, 'C001', '1001');
    const { envelope } = await sealEnvelope(meas('C001'), new HybridClock(device.nodeId).tick(), 'C001', s.keys.get('C001')!, device);
    const key = authorKeys(envelope.autor);
    for (const field of ['id', 'hlc', 'autor', 'keyRef', 'sha256', 'firma'] as const) {
      for (const bit of [0, 1, 6, 9, 17]) {
        expect((await checkEnvelope({ ...envelope, [field]: flipBit(envelope[field], field, bit) }, key)).ok, `${field} bit ${bit}`).toBe(false);
      }
    }
  });

  it('un SEU en el sobre se restaura desde la réplica local y la copia dañada queda en cuarentena', async () => {
    const s = await unlockKeyring(ring, 'C001', '1001');
    const clock = new HybridClock(device.nodeId);
    const envs: Envelope[] = [];
    for (const v of [118, 119, 120]) envs.push(await seal(meas('C001', v), 'C001', s.keys, clock));

    await db.injectBitFlip('envelopes', envs[1].id, 'ct', 13);

    const recovered: string[] = [];
    const replicas: string[] = [];
    const guard = new IntegrityGuard(db, authorKeys, { onRecovered: (id) => recovered.push(id), onReplicaRequest: (id) => replicas.push(id) });
    const report = await guard.readAll(s.keys);

    expect(sbpOf(report.ops)).toEqual([118, 119, 120]);
    expect(report.recovered).toEqual([{ id: envs[1].id, reason: expect.stringContaining('SHA-256') }]);
    expect(report.quarantined).toEqual([]);
    expect(recovered).toEqual([envs[1].id]);
    expect(replicas).toEqual([]);
    expect(await db.getEnvelope(envs[1].id)).toEqual(envs[1]); // byte a byte el original firmado
    expect((await db.allQuarantine()).map((q) => q.reason)).toEqual([expect.stringContaining('recuperado')]);

    const again = await guard.readAll(s.keys);
    expect(again.recovered).toHaveLength(0);
    expect(again.ops).toHaveLength(3);
  });

  it('una réplica dañada con primario sano se repara al leer', async () => {
    const s = await unlockKeyring(ring, 'C001', '1001');
    const e = await seal(meas('C001'), 'C001', s.keys);
    await db.injectBitFlip('replica', e.id, 'iv', 5);
    const report = await new IntegrityGuard(db, authorKeys).readAll(s.keys);
    expect(report.ops).toHaveLength(1);
    expect(await db.getReplica(e.id)).toEqual(e);
  });

  it('sin copia válida: aísla el sobre, pide réplica al Hub y sigue leyendo el resto', async () => {
    const s = await unlockKeyring(ring, 'C001', '1001');
    const clock = new HybridClock(device.nodeId);
    const envs: Envelope[] = [];
    for (const v of [118, 119, 120]) envs.push(await seal(meas('C001', v), 'C001', s.keys, clock));
    await db.injectBitFlip('envelopes', envs[1].id, 'iv', 3);
    await db.injectBitFlip('replica', envs[1].id, 'ct', 3);

    const replicas: string[] = [];
    const quarantined: string[] = [];
    const guard = new IntegrityGuard(db, authorKeys, { onReplicaRequest: (id) => replicas.push(id), onQuarantine: (id) => quarantined.push(id) });
    const report = await guard.readAll(s.keys);

    expect(sbpOf(report.ops)).toEqual([118, 120]);
    expect(report.quarantined).toEqual([{ id: envs[1].id, reason: expect.stringContaining('SHA-256') }]);
    expect(replicas).toEqual([envs[1].id]);
    expect(quarantined).toEqual([envs[1].id]);
    expect(await db.getEnvelope(envs[1].id)).toBeUndefined();
    expect(await db.getReplica(envs[1].id)).toBeUndefined();

    const again = await guard.readAll(s.keys);
    expect(again.ops).toHaveLength(2);
    expect(again.quarantined).toHaveLength(0);
  });

  it('una firma dañada sin réplica válida se aísla', async () => {
    const s = await unlockKeyring(ring, 'C001', '1001');
    const b = await seal(meas('C001', 122), 'C001', s.keys);
    await db.injectBitFlip('envelopes', b.id, 'firma', 40);
    await db.injectBitFlip('replica', b.id, 'firma', 41);
    const report = await new IntegrityGuard(db, authorKeys).readAll(s.keys);
    expect(report.ops).toHaveLength(0);
    expect(report.quarantined.map((q) => q.reason)).toEqual(['firma del dispositivo inválida']);
  });

  it('verifica tras escribir (write-verify)', async () => {
    const s = await unlockKeyring(ring, 'C001', '1001');
    const guard = new IntegrityGuard(db, authorKeys);
    const { envelope } = await sealEnvelope(meas('C001'), new HybridClock(device.nodeId).tick(), 'C001', s.keys.get('C001')!, device);
    expect(await guard.store(envelope)).toBe(true);
    expect(await guard.store(envelope)).toBe(false); // G-Set idempotente
    const { envelope: bad } = await sealEnvelope(meas('C001'), new HybridClock(device.nodeId).tick(), 'C001', s.keys.get('C001')!, device);
    await expect(guard.store({ ...bad, ct: flipBit(bad.ct, 'ct', 2) })).rejects.toBeInstanceOf(WriteVerifyError);
  });

  it('no lanza aunque todos los sobres y réplicas estén corruptos', async () => {
    const s = await unlockKeyring(ring, 'C001', '1001');
    const e = await seal(meas('C001'), 'C001', s.keys);
    await db.injectBitFlip('envelopes', e.id, 'ct', 0);
    await db.injectBitFlip('replica', e.id, 'ct', 1);
    await expect(new IntegrityGuard(db, authorKeys).readAll(s.keys)).resolves.toMatchObject({ ops: [] });
  });

  it('el G-Set ignora un sobre repetido (merge idempotente)', async () => {
    const s = await unlockKeyring(ring, 'C001', '1001');
    const e = await seal(meas('C001'), 'C001', s.keys);
    expect(await db.addEnvelope(e)).toBe(false);
    expect(await db.allEnvelopes()).toHaveLength(1);
  });

  it('RNF-SEC-01: ningún dato biométrico, nombre ni PIN en claro en IndexedDB', async () => {
    const cmo = await unlockKeyring(ring, CMO, '1002');
    const clock = new HybridClock(device.nodeId);
    await seal({ t: 'measurement', crewId: 'C003', day: 141, fields: { hr: 97, sbp: 143, dbp: 91, spo2: 92.4, glucose: 131.7, sleep: 4.6 }, source: 'manual' }, 'C003', cmo.keys, clock);
    await seal({ t: 'symptom', crewId: 'C003', day: 141, symptom: 'blurredVision', active: true, source: 'manual' }, 'C003', cmo.keys, clock);
    const ledger = new Ledger(db, device, clock);
    await ledger.append('measurement', 'C003', 'PAS 143 mmHg, SpO2 92.4 %', 'C003', cmo.keys.get('C003')!);
    await db.putVault('keyring', ring);
    await db.putVault('device', device);

    const raw = JSON.stringify(await db.dump(), (_k, v) => (v instanceof CryptoKey ? '[CryptoKey]' : v));
    // Agujas con comillas, puntos o espacios: no pueden aparecer por azar dentro de cadenas base64/hex.
    // El tipo de evento de la bitácora ('measurement') es metadato no clínico (event_type del ER) y se permite.
    const needles = ['92.4', '131.7', '4.6', '"sbp"', '"spo2"', '"glucose"', '"fields"', 'blurredVision', 'PAS 143', '"pin"', '"1002"',
      ...SYNTHETIC.crew.map((c) => c.name)];
    for (const needle of needles) {
      expect(raw.includes(needle), needle).toBe(false);
    }
  });

  it('RNF-SEC-01: el código fuente no usa localStorage ni sessionStorage', () => {
    const files = Object.entries(import.meta.glob('../src/**/*.{ts,svelte}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>);
    expect(files.length).toBeGreaterThan(20);
    const offenders = files.filter(([, src]) => /\b(localStorage|sessionStorage)\s*[.[]/.test(src)).map(([f]) => f);
    expect(offenders).toEqual([]);
  });
});

// ------------------------------------------------------------------ (3)
describe('(3) Inmutabilidad de la bitácora encadenada (RNF-SEC-04, RF-REG-01)', () => {
  async function filledLedger() {
    const s = await unlockKeyring(ring, CMO, '1002');
    const ledger = new Ledger(db, device, new HybridClock(device.nodeId));
    const types = ['alert_raised', 'ack', 'check', 'check', 'override'] as const;
    // Escrituras concurrentes: la cola interna las serializa.
    const recs = await Promise.all(types.map((t, i) => ledger.append(t, 'C003', `evento ${i}`, 'C003', s.keys.get('C003')!)));
    return { s, ledger, recs };
  }
  const signers = (node: string) => (node === device.nodeId ? { alg: device.alg, publicJwk: device.publicJwk } : null);

  it('cada entrada enlaza con el hash de la anterior del mismo nodo', async () => {
    const { ledger, recs } = await filledLedger();
    expect(recs.map((r) => r.seq)).toEqual([1, 2, 3, 4, 5]);
    expect(recs[0].prevHash).toBe('0'.repeat(64));
    for (let i = 1; i < recs.length; i++) expect(recs[i].prevHash).toBe(recs[i - 1].hash);
    expect(await ledger.verifyChain(signers)).toEqual({ ok: true, checked: 5 });
  });

  it('no expone métodos de edición ni borrado', () => {
    const methods = Object.getOwnPropertyNames(Ledger.prototype);
    expect(methods.filter((m) => /update|edit|delete|remove|put|set|clear/i.test(m))).toEqual([]);
  });

  it('las entradas devueltas están congeladas', async () => {
    const { recs } = await filledLedger();
    expect(Object.isFrozen(recs[0])).toBe(true);
  });

  it('sobrescribir una clave existente falla (IndexedDB add)', async () => {
    const { recs } = await filledLedger();
    await expect(db.appendLedger({ ...recs[2], type: 'reset' })).rejects.toBeTruthy();
  });

  it('una alteración directa en el almacén rompe la cadena y se localiza', async () => {
    const { ledger, recs } = await filledLedger();
    await db.injectBitFlip('ledger', recs[2].key, 'ct', 7);
    const check = await ledger.verifyChain(signers);
    expect(check.ok).toBe(false);
    expect(check.brokenAt).toBe(recs[2].key);
  });

  it('un nodo remoto no puede reemplazar una entrada existente', async () => {
    const { ledger, recs } = await filledLedger();
    const forged = { ...recs[1], prevHash: recs[1].prevHash, detail: 'x', hash: 'f'.repeat(64) };
    expect(await ledger.mergeRemote([forged])).toEqual({ added: 0, rejected: 1 });
    expect(await ledger.verifyChain(signers)).toMatchObject({ ok: true });
  });

  it('la vista descifrada respeta el RBAC', async () => {
    const { ledger } = await filledLedger();
    const astro = await unlockKeyring(ring, 'C001', '1001');
    const cmo = await unlockKeyring(ring, CMO, '1002');
    expect((await ledger.entries(astro.keys)).every((e) => e.detail === null)).toBe(true);
    expect((await ledger.entries(cmo.keys)).map((e) => e.detail)).toEqual(['evento 0', 'evento 1', 'evento 2', 'evento 3', 'evento 4']);
  });
});

// ------------------------------------------------------------------ (4)
describe('(4) Convergencia CRDT idempotente con relojes desfasados (RNF-NET-02, ADR-009)', () => {
  // Nodo A con reloj correcto; nodo B atrasado 1 hora; nodo C adelantado 10 min.
  let tA = 1_731_686_400_000;
  const tB = tA - 3_600_000;
  const tC = tA + 600_000;
  const A = new HybridClock('nodeA', () => tA);
  const B = new HybridClock('nodeB', () => tB);
  const C = new HybridClock('nodeC', () => tC);
  let n = 0;
  const op = (clock: HybridClock, body: OpBody, h = clock.tick()): Op => ({ id: `op${n++}`, hlc: h, author: clock.nodeId, keyRef: 'hab', body });

  function build(ops: Op[]): CrdtState {
    const s = new CrdtState();
    for (const o of ops) s.apply(o);
    return s;
  }
  function snapshot(s: CrdtState) {
    return {
      ops: s.ops.keys(),
      lww: s.lww.toJSON(),
      xp: { C001: s.counter('xp:C001'), C002: s.counter('xp:C002') },
      vv: s.vv,
    };
  }

  it('HLC nunca retrocede aunque el reloj de pared sí', () => {
    const clock = new HybridClock('n', () => tA);
    const h1 = clock.tick();
    tA -= 5_000; // salto atrás del reloj del sistema
    const h2 = clock.tick();
    tA += 5_000;
    expect(compareHlc(h2, h1)).toBeGreaterThan(0);
  });

  it('un nodo atrasado que recibe un evento remoto queda ordenado después', () => {
    const ha = A.tick();
    const hb = B.receive(ha); // B va 1 h atrasado
    expect(compareHlc(hb, ha)).toBeGreaterThan(0);
    expect(encodeHlc(hb) > encodeHlc(ha)).toBe(true); // la codificación conserva el orden
  });

  it('merge conmutativo, asociativo e idempotente (G-Set, LWW-Map, PN-Counter)', () => {
    const opsA = [
      op(A, meas('C001', 120)),
      op(A, { t: 'lww', key: 'pref.redMode', value: false }),
      op(A, { t: 'pn', key: 'xp:C001', delta: 50 }),
    ];
    // B (atrasado 1 h) cambia la misma preferencia DESPUÉS de ver la de A: debe ganar B pese a su reloj.
    const hbAfter = B.receive(opsA[1].hlc);
    const opsB = [
      op(B, { t: 'lww', key: 'pref.redMode', value: true }, hbAfter),
      op(B, { t: 'pn', key: 'xp:C001', delta: 20 }),
      op(B, { t: 'pn', key: 'xp:C002', delta: -10 }),
      op(B, { t: 'ack', alertId: 'C001:R-SANS-01', crewId: 'C001', day: 120, by: 'C002' }),
    ];
    // C (adelantado) escribe concurrentemente sin ver a nadie: el desempate por HLC es determinista.
    const opsC = [op(C, { t: 'lww', key: 'pref.largeText', value: true }), op(C, { t: 'pn', key: 'xp:C001', delta: 5 })];

    const sA = () => build(opsA);
    const sB = () => build(opsB);
    const sC = () => build(opsC);

    const ab = snapshot(sA().merge(sB()));
    const ba = snapshot(sB().merge(sA()));
    expect(ab).toEqual(ba); // conmutativo

    const ab_c = snapshot(sA().merge(sB()).merge(sC()));
    const a_bc = snapshot(sA().merge(sB().merge(sC())));
    expect(ab_c).toEqual(a_bc); // asociativo

    const twice = sA().merge(sB()).merge(sC());
    twice.merge(sB()).merge(sA()).merge(sC());
    expect(snapshot(twice)).toEqual(ab_c); // idempotente

    // Cualquier orden de entrega (con duplicados) converge al mismo estado.
    const shuffled = [...opsC, ...opsB, ...opsA, ...opsB].reverse();
    expect(snapshot(build(shuffled))).toEqual(ab_c);

    expect(ab_c.lww).toEqual({ 'pref.largeText': true, 'pref.redMode': true });
    expect(ab_c.xp).toEqual({ C001: 75, C002: -10 });
    expect(ab_c.ops).toHaveLength(9); // ningún dato clínico se pierde ni se sobrescribe
  });

  it('PN-Counter y LWW-Map por estado también convergen', () => {
    const p1 = new PNCounter(); p1.increment('a', 3); p1.decrement('b', 1);
    const p2 = new PNCounter(); p2.increment('b', 4);
    expect(new PNCounter().merge(p1).merge(p2).value).toBe(new PNCounter().merge(p2).merge(p1).merge(p2).value);

    const h1 = { wallMs: 10, counter: 0, nodeId: 'a' };
    const h2 = { wallMs: 10, counter: 0, nodeId: 'b' }; // mismo instante: desempata nodeId
    const m1 = new LwwMap<string>(); m1.set('k', 'A', h1);
    const m2 = new LwwMap<string>(); m2.set('k', 'B', h2);
    expect(new LwwMap<string>().merge(m1).merge(m2).get('k')).toBe('B');
    expect(new LwwMap<string>().merge(m2).merge(m1).get('k')).toBe('B');

    const g1 = new GSet<number>(String); g1.add(1); g1.add(2);
    const g2 = new GSet<number>(String); g2.add(2); g2.add(3);
    expect(new GSet<number>(String).merge(g1).merge(g2).keys()).toEqual(['1', '2', '3']);
  });

  it('el VersionVector entrega solo el delta que falta', () => {
    const s = new CrdtState();
    const items = [A.tick(), A.tick(), B.tick()].map((h) => ({ hlc: encodeHlc(h), h }));
    const remote = { nodeA: items[0].h.wallMs * 1000 + items[0].h.counter };
    expect(deltaFor(items, remote).map((i) => i.hlc)).toEqual([items[1].hlc, items[2].hlc]);
    expect(s.vv).toEqual({});
  });
});

// ------------------------------------------------------------------ extra
describe('Telemetry Sources (RF-ING-01..05, RF-SIM-01..05)', () => {
  const ds = generateDataset();
  const mk = (body: OpBody, t: number): Op => ({ id: `t${t}`, hlc: { wallMs: t, counter: 0, nodeId: 'n' }, author: 'n', keyRef: 'hab', body });

  it('dataset determinista de 180 días × 4 tripulantes', () => {
    expect(Object.keys(ds.measurements)).toEqual(['C001', 'C002', 'C003', 'C004']);
    expect(ds.measurements.C001).toHaveLength(180);
    expect(ds.habitat).toHaveLength(180);
    expect(generateDataset().measurements.C003[150]).toEqual(ds.measurements.C003[150]);
  });

  it('entrada manual: marca dudosos sin descartar y rechaza tipos inválidos', () => {
    const r = manualEntry('C001', 120, { hr: 300, sbp: 118, mood: 'x' as unknown as number });
    expect(r.body).toMatchObject({ fields: { hr: 300, sbp: 118 }, source: 'manual' });
    expect(r.suspect).toEqual(['hr']);
    expect(r.rejected).toEqual(['mood']);
  });

  it('escenarios A-F (letras del SRS §3.8) y reset en 1 toque', () => {
    const day = 120;
    const ops: Op[] = [];
    let t = 1;
    for (const b of scenarioOps('B', 'C001', day)) ops.push(mk(b, t++)); // SANS
    for (const b of scenarioOps('A', 'C001', day)) ops.push(mk(b, t++)); // SPE
    for (const b of scenarioOps('E', 'C004', day)) ops.push(mk(b, t++)); // sueño + HRV
    ops.push(mk(symptomToggle('C002', day, 'headache', true), t++));
    let v = buildView(ds, ops, day);
    expect(v.activeScenarios).toEqual(['B', 'A', 'E']);
    expect(v.measurements.C001.at(-1)!.sbp).toBe(144);
    expect(v.habitat.at(-1)!.radiation).toBe(185);
    expect(v.symptoms.C001.sort()).toEqual(['blurred_vision', 'headache', 'nausea']);
    expect(v.measurements.C004.slice(-2).map((m) => m.sleep)).toEqual([5.0, 5.0]); // sostenido 2 días

    const b = scenarioOps('C', 'C001', day); // CO₂
    for (const o of b) ops.push(mk(o, t++));
    v = buildView(ds, ops, day);
    expect(['C001', 'C002', 'C003', 'C004'].every((c) => v.measurements[c].at(-1)!.spo2 === 92)).toBe(true);

    ops.push(mk(resetOp(day), t));
    v = buildView(ds, ops, day);
    expect(v.activeScenarios).toEqual([]);
    expect(v.habitat.at(-1)!.radiation).toBe(ds.habitat[day - 1].radiation);
    expect(v.symptoms.C002).toEqual(['headache']); // lo manual sobrevive al reset
  });

  it('el reloj simulado usa un único setTimeout y ninguno en reposo', () => {
    const live = new Set<number>();
    let next = 0;
    const fns = new Map<number, () => void>();
    const timers = {
      set: (fn: () => void) => { const h = ++next; live.add(h); fns.set(h, fn); return h; },
      clear: (h: unknown) => { live.delete(h as number); },
    };
    const days: number[] = [];
    const clock = new SimClock(178, 180, (d) => days.push(d), timers);
    expect(live.size).toBe(0);
    clock.play(10);
    expect(live.size).toBe(1);
    const fire = () => { const h = [...live][0]; live.delete(h); fns.get(h)!(); };
    fire();
    expect(live.size).toBe(1);
    fire();
    expect(days).toEqual([179, 180]);
    expect(live.size).toBe(0); // se detiene al final
    clock.setDay(100);
    clock.play(10);
    clock.pause();
    expect(live.size).toBe(0);
  });
});

describe('Export Builder (RF-ING-06, RF-REG-02, RNF-NET-04)', () => {
  it('firma Ed25519, verifica y detecta alteraciones', async () => {
    const payload = buildPayload({
      kind: 'history', missionDay: 120, crew: [{ id: 'C001', name: 'X', role: 'commander' }], assessments: [],
      measurements: generateDataset().measurements.C001.slice(0, 3), habitat: [], ledger: [], fsMessages: {},
      now: new Date('2026-11-15T00:00:00Z'),
    });
    const doc = await signExport(payload, device, '0'.repeat(64));
    expect(doc.signature.alg).toBe('Ed25519');
    expect(await verifyExport(doc)).toBe(true);
    expect(await parseImport(serialize(doc))).toEqual(payload);

    const tampered = JSON.parse(serialize(doc));
    tampered.payload.measurements[0].sbp = 99;
    expect(await verifyExport(tampered)).toBe(false);

    const gz = await compress(serialize(doc));
    expect(gz?.[0]).toBe(0x1f); // cabecera gzip
  });

  it('anonimiza nombres para usos no médicos (ADR-012)', () => {
    const p = buildPayload({
      kind: 'summary', missionDay: 1, crew: [{ id: 'C001', name: 'Cmdte. Rachel Calloway', role: 'commander' }], assessments: [],
      measurements: [], habitat: [], ledger: [], fsMessages: {}, anonymize: true,
    });
    expect(p.crew[0].name).toBe('C001');
  });
});

describe('Sync Client (RNF-NET-01..03)', () => {
  class FakeWs implements WebSocketLike {
    static instances: FakeWs[] = [];
    readyState = 0;
    sent: string[] = [];
    onopen: ((ev: unknown) => void) | null = null;
    onclose: ((ev: unknown) => void) | null = null;
    onerror: ((ev: unknown) => void) | null = null;
    onmessage: ((ev: { data: unknown }) => void) | null = null;
    constructor(public url: string) { FakeWs.instances.push(this); }
    send(d: string) { this.sent.push(d); }
    close() { this.readyState = 3; this.onclose?.({}); }
    open() { this.readyState = 1; this.onopen?.({}); }
    fail() { this.readyState = 3; this.onerror?.({}); this.onclose?.({}); }
  }

  function make(enabled = true) {
    FakeWs.instances = [];
    const pending: { fn: () => void; ms: number }[] = [];
    const timers = { set: (fn: () => void, ms: number) => { const t = { fn, ms }; pending.push(t); return t; }, clear: (h: unknown) => { const i = pending.indexOf(h as never); if (i >= 0) pending.splice(i, 1); } };
    const received: Envelope[] = [];
    const statuses: string[] = [];
    const client = new SyncClient({
      nodeId: 'nodeA', enabled, WebSocketImpl: FakeWs, timers,
      getVersionVector: () => ({ nodeA: 5 }),
      onEnvelopes: (e) => { received.push(...e); },
      onStatus: (s) => statuses.push(s),
    });
    return { client, pending, received, statuses };
  }

  it('deshabilitado fuera del Hub: no abre sockets', () => {
    const { client } = make(false);
    client.start();
    expect(FakeWs.instances).toHaveLength(0);
    expect(client.status).toBe('disabled');
  });

  it('sends a signed HANDSHAKE with its VersionVector as HLC strings and applies DELTA_PUSH', async () => {
    const { client, received } = make();
    client.start();
    const ws = FakeWs.instances[0];
    expect(ws.url).toBe('wss://astha.local:8443/ws/sync');
    ws.open();
    await Promise.resolve(); await Promise.resolve();
    const hs = JSON.parse(ws.sent[0]);
    expect(hs).toMatchObject({ type: 'HANDSHAKE', deviceId: 'nodeA', versionVector: { nodeA: '000000000000000:005:nodeA' } });
    expect(Date.parse(hs.timestampUtc)).not.toBeNaN();
    ws.onmessage!({ data: JSON.stringify({ type: 'DELTA_PUSH', envelopes: [{ id: 'x' }] }) });
    await Promise.resolve();
    expect(received.map((e) => e.id)).toEqual(['x']);
    ws.onmessage!({ data: 'garbage' }); // does not throw
  });

  it('un único reintento con backoff exponencial (tope 5 min), suspendido si está oculta', () => {
    const { client, pending } = make();
    client.start();
    const delays: number[] = [];
    for (let i = 0; i < 10; i++) {
      FakeWs.instances.at(-1)!.fail();
      expect(pending).toHaveLength(1); // nunca más de un temporizador
      delays.push(pending[0].ms);
      pending.shift()!.fn();
    }
    expect(delays.slice(0, 4)).toEqual([2000, 4000, 8000, 16000]);
    expect(Math.max(...delays)).toBe(300_000);

    FakeWs.instances.at(-1)!.fail();
    client.setVisible(false);
    expect(pending).toHaveLength(0); // oculta: sin reintentos
    client.setVisible(true);
    expect(FakeWs.instances.at(-1)!.readyState).toBe(0); // reconecta al volver
    client.stop();
    expect(pending).toHaveLength(0);
  });

  it('derives the relay URL from the page origin (the hub serves the app, ADR-007)', () => {
    expect(hubUrlFor({ protocol: 'https:', host: 'astha.local:8443' })).toBe('wss://astha.local:8443/ws/sync');
    expect(hubUrlFor({ protocol: 'http:', host: 'localhost:8443' })).toBe('ws://localhost:8443/ws/sync');
    expect(hubUrlFor(undefined)).toBe('wss://astha.local:8443/ws/sync');
  });

  it('pide réplica por id de un sobre aislado', async () => {
    const { client } = make();
    client.start();
    client.requestReplica('abc');
    const ws = FakeWs.instances[0];
    ws.open();
    await Promise.resolve(); await Promise.resolve();
    expect(ws.sent.map((s) => JSON.parse(s).type)).toEqual(['HANDSHAKE', 'REPLICA_REQUEST']);
  });
});

vi.setConfig({ testTimeout: 20_000 });
