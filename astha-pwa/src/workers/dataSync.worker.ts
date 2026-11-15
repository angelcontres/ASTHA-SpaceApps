// Data y Sync Worker — Dedicated Worker (ADR-005, C4 §3.3).
// Envuelve src/storage/*: Key Manager (crypto), Encrypted Repository (idb + integrity), Integrity Guard,
// Audit Ledger, CRDT Store, Sync Client, Telemetry Sources y Export Builder.
// Las K_t desenvueltas (extractable: false) solo viven en `session.keys` y se borran al bloquear.
// Cada cambio aplicado al CRDT dispara la re-evaluación por el MessageChannel directo al Clinical Worker.
// Sin polling: todo responde a mensajes; el único temporizador es el del reloj simulado en reproducción.
import { CATALOG } from '../engine/countermeasures';
import type { Alert, Assessment } from '../engine/types';
import { CrdtState, deltaFor, HybridClock, type Op, type OpBody } from '../storage/crdt';
import {
  generateDeviceIdentity, provisionKeyring, unlockKeyring, WrongPinError,
  type DeviceIdentity, type Keyring,
} from '../storage/crypto';
import { buildPayload, fileName, parseImport, serialize, signExport } from '../storage/exportBuilder';
import { AsthaDb, type Envelope, type LedgerRecord } from '../storage/idb';
import { IntegrityGuard, sealEnvelope } from '../storage/integrity';
import { Ledger, type LedgerType } from '../storage/ledger';
import { SyncClient } from '../storage/syncClient';
import {
  buildView, generateDataset, manualEntry, resetOp, scenarioOps, SimClock, SYNTHETIC, symptomToggle,
  type TelemetryView,
} from '../storage/telemetrySources';
import {
  DEFAULT_PREFS,
  type ClinicalToData, type DataState, type DataToClinical, type DataToUi, type PrefKey, type Prefs, type UiToData,
} from './protocol';

interface WorkerScope {
  postMessage(msg: unknown): void;
  addEventListener(type: 'message', fn: (e: MessageEvent) => void): void;
}
const scope = globalThis as unknown as WorkerScope;
const post = (m: DataToUi) => scope.postMessage(m);

// ---------------- estado del worker ----------------

const CREW = SYNTHETIC.crew;
const CMO_ID = CREW.find((c) => c.role === 'cmo')!.id;
const dataset = generateDataset();

let db: AsthaDb | null = null;
let device: DeviceIdentity | null = null;
let ring: Keyring | null = null;
let provisioning: Promise<Keyring> | null = null;
let clock: HybridClock | null = null;
let ledger: Ledger | null = null;
let guard: IntegrityGuard | null = null;
let sync: SyncClient | null = null;
let clinicalPort: MessagePort | null = null;

let crdt = new CrdtState();
const envCache = new Map<string, Envelope>();
let session: { personId: string; role: DataState['crew'][number]['role']; keys: Map<string, CryptoKey>; allowed: string[] } | null = null;

let ready = false;
let selectedCrew = CREW[0].id;
let quarantinedCount = 0;
let lockedCount = 0;
let recoveredCount = 0;
let lastView: TelemetryView | null = null;
let lastAssessments: Assessment[] = [];
let prevAlertIds = new Set<string>();

const sim = new SimClock(SYNTHETIC.startDay, SYNTHETIC.days, (day) => {
  void serial(() => persist({ t: 'lww', key: 'sim.day', value: day }, 'hab'));
  scheduleEval();
});

/** Cola de tareas asíncronas: las escrituras se aplican en orden. */
let chain: Promise<unknown> = Promise.resolve();
function serial<T>(task: () => Promise<T>): Promise<T | undefined> {
  const run = chain.then(task).catch((e) => {
    console.error('[data] tarea fallida', e);
    return undefined;
  });
  chain = run;
  return run;
}

// ---------------- claves y persistencia ----------------

function currentKeys(): Map<string, CryptoKey> {
  if (session) return session.keys;
  return ring ? new Map([['hab', ring.habDeviceKey]]) : new Map();
}

function keyRefFor(crewId: string | null | undefined): string {
  return crewId && crewId !== 'HAB' && CREW.some((c) => c.id === crewId) ? crewId : 'hab';
}

function canWrite(crewId: string): boolean {
  return !!session && currentKeys().has(keyRefFor(crewId));
}

const authorKeys = (autor: string) =>
  device && autor === device.nodeId ? { alg: device.alg, publicJwk: device.publicJwk } : null;

/** Cifra, firma, guarda en IndexedDB, aplica al CRDT y empuja al Hub. */
async function persist(body: OpBody, keyRef: string): Promise<Op | null> {
  const key = currentKeys().get(keyRef);
  if (!db || !guard || !device || !clock || !key) return null;
  const { envelope, op } = await sealEnvelope(body, clock.tick(), keyRef, key, device);
  await guard.store(envelope); // G-Set + réplica, con verificación tras escritura (RNF-SEC-03)
  envCache.set(envelope.id, envelope);
  crdt.apply(op);
  sync?.push([envelope]);
  return op;
}

async function log(type: LedgerType, crewId: string | null, detail: string): Promise<void> {
  const keyRef = keyRefFor(crewId);
  const key = currentKeys().get(keyRef);
  if (!ledger || !key || !session) return;
  const rec = await ledger.append(type, crewId, detail, keyRef, key);
  sync?.push([], [rec as LedgerRecord]);
  scheduleLedger();
}

/** Reconstruye el estado derivado desde IndexedDB con las claves de la sesión actual. */
async function reload(): Promise<void> {
  if (!db || !guard) return;
  const report = await guard.readAll(currentKeys());
  crdt = new CrdtState();
  for (const op of report.ops) {
    crdt.apply(op);
    clock?.receive(op.hlc);
  }
  lockedCount = report.locked;
  recoveredCount += report.recovered.length;
  quarantinedCount = (await db.allQuarantine()).length;
  envCache.clear();
  for (const e of await db.allEnvelopes()) envCache.set(e.id, e);
  const day = crdt.lww.get('sim.day');
  if (typeof day === 'number') sim.day = day;
}

// ---------------- evaluación ----------------

let evalScheduled = false;
let pendingReqId = 0;
let reqSeq = 1_000_000; // ids internos; los de la UI son pequeños

function scheduleEval(reqId?: number): void {
  if (reqId) pendingReqId = reqId;
  if (evalScheduled) return;
  evalScheduled = true;
  queueMicrotask(() => {
    evalScheduled = false;
    evaluateNow();
  });
}

function evaluateNow(): void {
  const view = buildView(dataset, crdt.sorted(), sim.day);
  lastView = view;
  const allowed = session?.allowed ?? [];
  if (clinicalPort) {
    const req: DataToClinical = {
      type: 'evaluate',
      reqId: pendingReqId || reqSeq++,
      inputs: CREW.map((c) => ({
        crewId: c.id,
        day: view.day,
        measurements: view.measurements[c.id] ?? [],
        habitat: view.habitat,
        symptoms: allowed.includes(c.id) ? (view.symptoms[c.id] ?? []) : [],
        statusOnly: !allowed.includes(c.id),
        bonusXp: crdt.counter(`xp:${c.id}`),
      })),
    };
    pendingReqId = 0;
    clinicalPort.postMessage(req);
  }
  if (allowed.includes(selectedCrew)) {
    post({ type: 'series', crewId: selectedCrew, measurements: view.measurements[selectedCrew] ?? [], habitat: view.habitat });
  } else {
    // Antes del PIN solo el hábitat (ADR-015).
    post({ type: 'series', crewId: '', measurements: [], habitat: view.habitat });
  }
  postState();
}

function onClinicalResult(msg: ClinicalToData): void {
  lastAssessments = msg.items;
  if (!session) return;
  const now = new Map<string, Alert>();
  for (const a of msg.items) for (const al of a.alerts) now.set(al.id, al);
  const raised = [...now.values()].filter((a) => !prevAlertIds.has(a.id));
  const resolved = [...prevAlertIds].filter((id) => !now.has(id));
  prevAlertIds = new Set(now.keys());
  if (!raised.length && !resolved.length) return;
  void serial(async () => {
    for (const a of raised) {
      // G-Set de alertas: una sola entrada por episodio y día, aunque se recargue la app.
      const seen = [...crdt.ops.values()].some((o) => o.body.t === 'alert' && o.body.alertId === a.id && o.body.day === a.day);
      if (seen) continue;
      const op = await persist({ t: 'alert', alertId: a.id, crewId: a.crewId, ruleId: a.ruleId, status: a.status, day: a.day }, keyRefFor(a.crewId));
      if (op) await log('alert_raised', a.crewId === 'HAB' ? null : a.crewId, `${a.ruleId} · ${a.status} · ${a.explanation}`);
    }
    for (const id of resolved) await log('alert_resolved', null, id);
  });
}

// ---------------- estado hacia la UI ----------------

let stateScheduled = false;
function postState(): void {
  if (stateScheduled) return;
  stateScheduled = true;
  queueMicrotask(() => {
    stateScheduled = false;
    post({ type: 'state', state: buildState() });
  });
}

function buildState(): DataState {
  const day = sim.day;
  const acks: string[] = [];
  const overrides: string[] = [];
  const stepState = new Map<string, Map<string, boolean>>();
  for (const op of crdt.sorted()) {
    const b = op.body;
    if (b.t === 'ack' && b.day === day) acks.push(b.alertId);
    else if (b.t === 'override' && b.day === day) overrides.push(b.alertId);
    else if (b.t === 'check' && b.day === day) {
      let m = stepState.get(b.alertId);
      if (!m) stepState.set(b.alertId, (m = new Map()));
      m.set(b.stepId, b.checked); // el último evento por HLC decide; los anteriores siguen en el G-Set
    }
  }
  const checks: Record<string, string[]> = {};
  for (const [alertId, m] of stepState) checks[alertId] = [...m].filter(([, on]) => on).map(([s]) => s);

  const prefs: Prefs = { ...DEFAULT_PREFS };
  for (const k of Object.keys(DEFAULT_PREFS) as PrefKey[]) {
    const v = crdt.lww.get(`pref.${k}`);
    if (typeof v === 'boolean') prefs[k] = v;
  }
  const allowed = session?.allowed ?? [];
  const symptoms: DataState['symptoms'] = {};
  for (const c of allowed) symptoms[c] = lastView?.symptoms[c] ?? [];

  return {
    ready,
    provisioning: !!provisioning,
    session: session ? { personId: session.personId, role: session.role, allowedCrew: allowed } : null,
    crew: CREW.map((c) => ({ id: c.id, name: c.name, role: c.role })),
    selectedCrew,
    day,
    maxDay: SYNTHETIC.days,
    playing: sim.playing,
    activeScenarios: lastView?.activeScenarios ?? [],
    symptoms,
    acks: [...new Set(acks)],
    checks,
    overrides: [...new Set(overrides)],
    prefs,
    xp: Object.fromEntries(allowed.map((c) => [c, crdt.counter(`xp:${c}`)])),
    syncStatus: sync?.status ?? 'disabled',
    quarantinedCount,
    lockedCount,
    recoveredCount,
    nodeId: device?.nodeId ?? '',
  };
}

let ledgerScheduled = false;
function scheduleLedger(withChain = false): void {
  if (ledgerScheduled && !withChain) return;
  ledgerScheduled = true;
  queueMicrotask(async () => {
    ledgerScheduled = false;
    if (!ledger || !session) return post({ type: 'ledger', entries: [], chain: null });
    const entries = (await ledger.entries(session.keys)).slice(-200);
    const chainCheck = withChain
      ? await ledger.verifyChain((n) => (device && n === device.nodeId ? { alg: device.alg, publicJwk: device.publicJwk } : null))
      : null;
    post({ type: 'ledger', entries, chain: chainCheck });
  });
}

function notice(level: 'info' | 'error', code: string, message: string, reqId?: number): void {
  post({ type: 'notice', level, code, message, reqId });
}

// ---------------- acciones ----------------

async function handle(msg: UiToData): Promise<void> {
  const reqId = msg.reqId;
  switch (msg.type) {
    case 'unlock': {
      if (!ring && provisioning) await provisioning;
      if (!ring) return notice('error', 'no-keyring', 'El dispositivo no está aprovisionado.', reqId);
      try {
        const s = await unlockKeyring(ring, msg.personId, msg.pin);
        const role = CREW.find((c) => c.id === msg.personId)!.role;
        const allowed = CREW.map((c) => c.id).filter((id) => s.keys.has(id));
        session = { personId: msg.personId, role, keys: s.keys, allowed };
        selectedCrew = msg.personId;
        await reload();
        prevAlertIds = new Set();
        await log('unlock', msg.personId, `Sesión iniciada (${role})`);
        sync?.start();
        scheduleEval(reqId);
        scheduleLedger();
      } catch (e) {
        notice('error', 'wrong-pin', e instanceof WrongPinError ? 'PIN incorrecto' : 'No se pudo desbloquear', reqId);
      }
      return;
    }
    case 'lock': {
      if (!session) return;
      await log('lock', session.personId, 'Sesión bloqueada');
      session.keys.clear(); // las K_t salen de la memoria del worker
      session = null;
      sim.pause();
      sync?.stop();
      prevAlertIds = new Set();
      await reload();
      scheduleEval(reqId);
      scheduleLedger();
      return;
    }
    case 'selectCrew':
      if (session?.allowed.includes(msg.crewId)) selectedCrew = msg.crewId;
      return scheduleEval(reqId);
    case 'setDay':
    case 'advance':
    case 'play':
    case 'pause':
      if (!session) return;
      if (msg.type === 'setDay') sim.setDay(msg.day);
      else if (msg.type === 'advance') sim.advance(msg.days);
      else if (msg.type === 'play') sim.play(msg.msPerDay);
      else sim.pause();
      return postState();
    case 'scenario': {
      if (!session) return;
      const target = msg.crewId ?? selectedCrew;
      if (!canWrite(target)) return notice('error', 'forbidden', 'Sin acceso a ese tripulante.', reqId);
      let skipped = 0;
      for (const body of scenarioOps(msg.id, target, sim.day)) {
        const crewId = 'crewId' in body ? body.crewId : null;
        // Un astronauta solo puede cifrar con su K_t: las inyecciones a otros tripulantes se omiten.
        if (crewId && !canWrite(crewId)) { skipped++; continue; }
        await persist(body, keyRefFor(crewId));
      }
      await log('scenario', target, `Escenario ${msg.id} inyectado en el día ${sim.day}${skipped ? ` (${skipped} registros omitidos por RBAC)` : ''}`);
      return scheduleEval(reqId);
    }
    case 'reset':
      if (!session) return;
      await persist(resetOp(sim.day), 'hab');
      await log('reset', null, `Estado nominal restablecido en el día ${sim.day}`);
      return scheduleEval(reqId);
    case 'manualEntry': {
      if (!canWrite(msg.crewId)) return notice('error', 'forbidden', 'Sin acceso a ese tripulante.', reqId);
      const r = manualEntry(msg.crewId, sim.day, msg.fields);
      const firstToday = ![...crdt.ops.values()].some(
        (o) => o.body.t === 'measurement' && o.body.source === 'manual' && o.body.crewId === msg.crewId && o.body.day === sim.day,
      );
      await persist(r.body, msg.crewId);
      if (firstToday) await persist({ t: 'pn', key: `xp:${msg.crewId}`, delta: 20 }, msg.crewId); // RF-GAM-01
      await log('measurement', msg.crewId, `Registro manual: ${Object.entries(r.body.t === 'measurement' ? r.body.fields : {}).map(([k, v]) => `${k}=${v}`).join(', ')}`);
      if (r.dubious.length) notice('info', 'dubious', `Datos marcados como dudosos: ${r.dubious.join(', ')}`, reqId);
      return scheduleEval(reqId);
    }
    case 'symptom':
      if (!canWrite(msg.crewId)) return;
      await persist(symptomToggle(msg.crewId, sim.day, msg.symptom, msg.active), msg.crewId);
      await log('symptom', msg.crewId, `${msg.symptom} ${msg.active ? 'reportado' : 'retirado'}`);
      return scheduleEval(reqId);
    case 'check':
      if (!canWrite(msg.crewId)) return;
      await persist({ t: 'check', alertId: msg.alertId, crewId: msg.crewId, protocolId: msg.protocolId, stepId: msg.stepId, checked: msg.checked, day: sim.day, by: session!.personId }, keyRefFor(msg.crewId));
      await log(msg.checked ? 'check' : 'uncheck', keyRefFor(msg.crewId) === 'hab' ? null : msg.crewId, `${msg.protocolId} · ${msg.stepId} · ${msg.alertId}`);
      return postState();
    case 'ack':
      if (!canWrite(msg.crewId)) return;
      await persist({ t: 'ack', alertId: msg.alertId, crewId: msg.crewId, day: sim.day, by: session!.personId }, keyRefFor(msg.crewId));
      await log('ack', keyRefFor(msg.crewId) === 'hab' ? null : msg.crewId, `Reconocida ${msg.alertId}`);
      return postState();
    case 'override':
      if (session?.role !== 'cmo' || !canWrite(msg.crewId)) return notice('error', 'forbidden', 'Solo el CMO puede anular alertas.', reqId);
      await persist({ t: 'override', alertId: msg.alertId, crewId: msg.crewId, day: sim.day, by: session.personId, reason: msg.reason }, keyRefFor(msg.crewId));
      await log('override', keyRefFor(msg.crewId) === 'hab' ? null : msg.crewId, `Anulada ${msg.alertId}: ${msg.reason}`);
      return postState();
    case 'setPref':
      if (!session) return;
      if (msg.key === 'survival' && session.role !== 'commander') {
        return notice('error', 'forbidden', 'Solo el Comandante activa el modo supervivencia (ADR-019).', reqId);
      }
      await persist({ t: 'lww', key: `pref.${msg.key}`, value: msg.value }, 'hab');
      return postState();
    case 'export':
      return exportNow(msg.kind, !!msg.anonymize, reqId);
    case 'import': {
      if (!session) return;
      const payload = await parseImport(msg.text);
      if (!payload) return notice('error', 'bad-import', 'Archivo inválido o firma no verificable.', reqId);
      let n = 0;
      for (const m of payload.measurements) {
        if (!canWrite(m.crewId)) continue;
        const { crewId, day, ...rest } = m;
        const fields = Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v === 'number')) as Record<string, number>;
        await persist({ t: 'measurement', crewId, day, fields, source: 'import' }, crewId);
        n++;
      }
      await log('import', null, `${n} mediciones importadas (firma ${payload.generatedAt})`);
      notice('info', 'imported', `${n} mediciones importadas.`, reqId);
      return scheduleEval(reqId);
    }
    case 'injectBitFlip': {
      if (!db || !session) return;
      const candidates = [...envCache.keys()];
      if (!candidates.length) return notice('info', 'no-data', 'No hay registros persistidos que corromper todavía.', reqId);
      const id = candidates[Math.floor(Math.random() * candidates.length)];
      const field = Math.random() < 0.5 ? 'ct' : 'iv';
      const bit = Math.floor(Math.random() * 96);
      await db.injectBitFlip('envelopes', id, field, bit);
      if (msg.both) await db.injectBitFlip('replica', id, field, bit);
      const before = recoveredCount;
      await reload(); // la verificación SHA-256 lo detecta: lo restaura desde la réplica o lo aísla
      notice('info', 'seu', recoveredCount > before
        ? `Bit ${bit} invertido en ${field} de ${id.slice(0, 8)}…: detectado y restaurado desde la réplica local.`
        : `Bit ${bit} invertido en ${field} de ${id.slice(0, 8)}… y en su réplica: aislado en cuarentena, réplica pedida al Hub.`, reqId);
      return scheduleEval(reqId);
    }
    case 'verifyLedger':
      return scheduleLedger(true);
    case 'visibility':
      sync?.setVisible(msg.visible);
      return;
    case 'online':
      sync?.notifyOnline();
      return;
    case 'connect':
      return; // gestionado en el listener (lleva el puerto)
  }
}

async function exportNow(kind: 'history' | 'summary', anonymize: boolean, reqId?: number): Promise<void> {
  if (!session || !device || !ledger || !lastView) return;
  const allowed = session.allowed;
  const fsMessages = Object.fromEntries(Object.entries(CATALOG.protocols).map(([id, p]) => [id, p.fsMessage]));
  const payload = buildPayload({
    kind,
    missionDay: sim.day,
    crew: CREW.filter((c) => allowed.includes(c.id)).map((c) => ({ id: c.id, name: c.name, role: c.role })),
    assessments: lastAssessments.filter((a) => allowed.includes(a.crewId)),
    measurements: allowed.flatMap((c) => lastView!.measurements[c] ?? []),
    habitat: lastView.habitat,
    ledger: await ledger.entries(session.keys),
    fsMessages,
    anonymize,
  });
  const doc = await signExport(payload, device);
  post({ type: 'exported', fileName: fileName(payload), text: serialize(doc) });
  await log('export', null, `Exportación ${kind} firmada (${doc.payloadSha256.slice(0, 12)}…)`);
  notice('info', 'exported', 'Paquete firmado listo para el enlace con Tierra.', reqId);
}

// ---------------- arranque ----------------

async function boot(): Promise<void> {
  try {
    db = await AsthaDb.open();
  } catch {
    db = null;
    notice('error', 'no-idb', 'IndexedDB no disponible: modo sin persistencia.');
  }
  if (db) {
    device = (await db.getVault<DeviceIdentity>('device')) ?? null;
    if (!device) {
      device = await generateDeviceIdentity();
      await db.putVault('device', device);
    }
    clock = new HybridClock(device.nodeId);
    ledger = new Ledger(db, device, clock);
    guard = new IntegrityGuard(db, authorKeys, {
      onQuarantine: (id, reason) => void serial(() => log('quarantine', null, `${id.slice(0, 12)}… aislado: ${reason}`)),
      onReplicaRequest: (id) => sync?.requestReplica(id),
      onRecovered: (id, reason) => void serial(() => log('quarantine', null, `${id.slice(0, 8)}… restaurado desde réplica local: ${reason}`)),
    });
    sync = new SyncClient({
      nodeId: device.nodeId,
      getVersionVector: () => crdt.vv,
      getDelta: (remote) => deltaFor(envCache.values(), remote),
      onEnvelopes: (envs, recs) => serial(() => applyRemote(envs, recs)),
      onStatus: () => postState(),
    });
    ring = (await db.getVault<Keyring>('keyring')) ?? null;
    if (ring) await reload();
    else {
      // Aprovisionamiento de demostración (sustituye a ADR-020). Se hace después de pintar la pantalla de bloqueo.
      provisioning = provisionKeyring(CREW.map((c) => ({ personId: c.id, pin: c.pin })), CMO_ID).then(async (r) => {
        await db!.putVault('keyring', r);
        ring = r;
        provisioning = null;
        postState();
        return r;
      });
    }
  }
  ready = true;
  scheduleEval();
}

async function applyRemote(envs: Envelope[], recs: LedgerRecord[]): Promise<void> {
  if (!db || !guard) return;
  for (const env of envs) {
    if (!(await db.addEnvelope(env))) continue;
    envCache.set(env.id, env);
    const r = await guard.open(env, currentKeys());
    if (r.status === 'ok') {
      crdt.apply(r.op);
      clock?.receive(r.op.hlc);
    } else if (r.status === 'locked') lockedCount++;
  }
  if (recs.length && ledger) await ledger.mergeRemote(recs);
  const day = crdt.lww.get('sim.day');
  if (typeof day === 'number' && day !== sim.day) sim.day = day;
  scheduleEval();
  scheduleLedger();
}

scope.addEventListener('message', (e: MessageEvent<UiToData>) => {
  const msg = e.data;
  if (msg.type === 'connect') {
    clinicalPort = e.ports[0] ?? null;
    if (clinicalPort) clinicalPort.onmessage = (ev: MessageEvent<ClinicalToData>) => onClinicalResult(ev.data);
    scheduleEval();
    return;
  }
  void serial(() => handle(msg));
});

// Primera evaluación inmediata con el dataset base: la pantalla de bloqueo no espera a IndexedDB (ADR-015).
scheduleEval();
void boot();
