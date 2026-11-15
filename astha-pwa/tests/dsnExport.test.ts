// Issue #7 [Data-03] — DoD AC-TECH-05: valid Ed25519 signature on the JSON exported for Houston.
// Package shape follows openapi.yaml `SignedDsnExport` (ADR-010, RNF-NET-04); gzip via CompressionStream.
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { HybridClock } from '../src/storage/crdt';
import { canonicalJson, fromB64, generateDataKey, generateDeviceIdentity, utf8 } from '../src/storage/crypto';
import {
  buildPayload, DSN_SCHEMA_VERSION, MISSION_ID, packageForDsn, parseImport, serialize, signExport, verifyExport,
  type SignedExport,
} from '../src/storage/exportBuilder';
import { AsthaDb } from '../src/storage/idb';
import { GENESIS, Ledger } from '../src/storage/ledger';
import { generateDataset, SYNTHETIC } from '../src/storage/telemetrySources';

const ds = generateDataset(SYNTHETIC);
const historyPayload = (anonymize = false) => buildPayload({
  kind: 'history', missionDay: 180,
  crew: SYNTHETIC.crew.map((c) => ({ id: c.id, name: c.name, role: c.role })),
  assessments: [],
  measurements: SYNTHETIC.crew.flatMap((c) => ds.measurements[c.id]),
  habitat: ds.habitat, ledger: [], fsMessages: {}, anonymize,
  now: new Date('2026-11-15T00:00:00Z'),
});

/** Independent check: WebCrypto Ed25519 verify over the canonical package minus the signature field. */
async function webCryptoVerify(doc: SignedExport): Promise<boolean> {
  const { ed25519Signature, ...unsigned } = doc;
  const key = await crypto.subtle.importKey('jwk', doc.signature.publicJwk, { name: 'Ed25519' }, false, ['verify']);
  return crypto.subtle.verify({ name: 'Ed25519' }, key, fromB64(ed25519Signature), utf8(canonicalJson(unsigned)));
}

describe('AC-TECH-05 · signed DSN export for Houston', () => {
  it('matches the SignedDsnExport contract and verifies with WebCrypto Ed25519 independently', async () => {
    const device = await generateDeviceIdentity();
    const doc = await signExport(historyPayload(), device, 'a'.repeat(64));
    expect(doc).toMatchObject({
      exportSchemaVersion: DSN_SCHEMA_VERSION, missionId: MISSION_ID, isAnonymized: false,
      signerDeviceId: device.nodeId, auditChainTipSha256: 'a'.repeat(64), generatedAtUtc: '2026-11-15T00:00:00.000Z',
    });
    expect(doc.signature.alg).toBe('Ed25519');
    expect(fromB64(doc.ed25519Signature)).toHaveLength(64); // raw Ed25519 signature
    expect(await webCryptoVerify(doc)).toBe(true);
    expect(await verifyExport(doc)).toBe(true);
    expect(await verifyExport(doc, device.publicJwk)).toBe(true); // pinned key
  });

  it('any change to payload or header, or a different signer key, invalidates the package', async () => {
    const device = await generateDeviceIdentity();
    const other = await generateDeviceIdentity();
    const doc = await signExport(historyPayload(), device, 'b'.repeat(64));
    const mutate = (f: (d: SignedExport) => void) => { const d = JSON.parse(serialize(doc)) as SignedExport; f(d); return d; };
    const cases: SignedExport[] = [
      mutate((d) => { d.payload.measurements[0].sbp += 1; }),
      mutate((d) => { d.payload.missionDay = 1; }),
      mutate((d) => { d.isAnonymized = true; d.payload.anonymized = true; }),
      mutate((d) => { d.signerDeviceId = other.nodeId; }),
      mutate((d) => { d.auditChainTipSha256 = 'c'.repeat(64); }),
      mutate((d) => { d.missionId = 'OTHER'; }),
      mutate((d) => { d.signature.publicJwk = other.publicJwk; }),
    ];
    for (const c of cases) expect(await verifyExport(c)).toBe(false);
    expect(await verifyExport(doc, other.publicJwk)).toBe(false);
    expect(await verifyExport({ ...doc, exportSchemaVersion: 'v0' } as unknown as SignedExport)).toBe(false);
  });

  it('gzip package shrinks the raw JSON by more than 70 % and round-trips on import', async () => {
    const device = await generateDeviceIdentity();
    const doc = await signExport(historyPayload(), device, GENESIS);
    const pkg = await packageForDsn(doc);
    expect(pkg.fileName).toMatch(/\.json\.gz$/);
    expect(pkg.gz![0]).toBe(0x1f);
    expect(pkg.gz![1]).toBe(0x8b);
    const ratio = 1 - pkg.gz!.length / new TextEncoder().encode(pkg.text).length;
    expect(ratio).toBeGreaterThan(0.7);
    const back = new TextDecoder().decode(await new Response(new Blob([pkg.gz! as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
    expect(await parseImport(back)).toEqual(doc.payload);
  });

  it('the signed audit-chain tip is the newest hash of the signer chain (RNF-SEC-04)', async () => {
    const db = await AsthaDb.open(`dsn-${Math.random()}`, new IDBFactory());
    const device = await generateDeviceIdentity();
    const ledger = new Ledger(db, device, new HybridClock(device.nodeId));
    expect(await ledger.tip()).toBe(GENESIS);
    const key = await generateDataKey(false);
    await ledger.append('export', null, 'one', 'hab', key);
    const last = await ledger.append('export', null, 'two', 'hab', key);
    expect(await ledger.tip()).toBe(last.hash);
    const doc = await signExport(historyPayload(true), device, await ledger.tip());
    expect(doc.auditChainTipSha256).toBe(last.hash);
    expect(doc.isAnonymized).toBe(true);
    expect(doc.payload.crew.every((c) => c.name === c.id)).toBe(true); // ADR-012
    expect(await verifyExport(doc)).toBe(true);
  });
});
