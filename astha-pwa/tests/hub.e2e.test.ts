// End-to-end interoperability: the PWA SyncClient (TypeScript, native WebSocket) against the real Rust Sync Hub
// binary (issue #12). Runs only when ASTHA_HUB_BIN points at a built hub, e.g.
//   (cd sync-hub && cargo build) && ASTHA_HUB_BIN=../sync-hub/target/debug/astha-sync-hub npx vitest run tests/hub.e2e.test.ts
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { deltaFor, HybridClock, vvOf, type OpBody } from '../src/storage/crdt';
import { generateDataKey, generateDeviceIdentity, sign, type DeviceIdentity } from '../src/storage/crypto';
import type { Envelope } from '../src/storage/idb';
import { sealEnvelope } from '../src/storage/integrity';
import { SyncClient, type WebSocketCtor } from '../src/storage/syncClient';

const BIN = process.env.ASTHA_HUB_BIN;

async function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const s = createServer().listen(0, '127.0.0.1', () => {
      const port = (s.address() as { port: number }).port;
      s.close(() => resolve(port));
    });
  });
}

async function until(cond: () => boolean | Promise<boolean>, ms = 5000): Promise<number> {
  const t0 = performance.now();
  while (!(await cond())) {
    if (performance.now() - t0 > ms) throw new Error(`timeout after ${ms} ms`);
    await new Promise((r) => setTimeout(r, 20));
  }
  return performance.now() - t0;
}

class Tablet {
  readonly envs = new Map<string, Envelope>();
  readonly clock: HybridClock;
  readonly client: SyncClient;
  constructor(readonly device: DeviceIdentity, private readonly key: CryptoKey, url: string, delays = { base: 100, max: 400 }) {
    this.clock = new HybridClock(device.nodeId);
    this.client = new SyncClient({
      nodeId: device.nodeId, url, enabled: true, WebSocketImpl: globalThis.WebSocket as unknown as WebSocketCtor,
      baseDelayMs: delays.base, maxDelayMs: delays.max,
      getVersionVector: () => vvOf(this.envs.values()),
      getDelta: (vv) => deltaFor(this.envs.values(), vv),
      signHandshake: (bytes) => sign(this.device, bytes),
      publicJwk: device.publicJwk,
      onEnvelopes: (list) => { for (const e of list) this.envs.set(e.id, e); },
    });
  }
  async write(body: OpBody): Promise<void> {
    const { envelope } = await sealEnvelope(body, this.clock.tick(), 'hab', this.key, this.device);
    this.envs.set(envelope.id, envelope);
    this.client.push([envelope]);
  }
}

const meas = (day: number, sbp: number): OpBody => ({ t: 'measurement', crewId: 'C001', day, fields: { sbp }, source: 'manual' });

describe.skipIf(!BIN)('PWA SyncClient ↔ Rust Sync Hub (real binary)', () => {
  const procs: ChildProcess[] = [];
  afterAll(() => { for (const p of procs) p.kill('SIGKILL'); });

  async function startHub(dataDir: string, enrollment: string, port: number, extra: string[] = []): Promise<ChildProcess> {
    const p = spawn(BIN!, ['--insecure-http', '--no-mdns', '--no-fsync', '--bind', `127.0.0.1:${port}`, '--data-dir', dataDir, '--enrollment', enrollment, ...extra], { stdio: 'ignore' });
    procs.push(p);
    await until(async () => (await fetch(`http://127.0.0.1:${port}/api/v1/health`).catch(() => null))?.ok === true);
    return p;
  }

  it('relays, survives a hub crash, converges, and lets a new tablet recover via GET /sync/deltas', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'astha-hub-e2e-'));
    const [devA, devB] = await Promise.all([generateDeviceIdentity(), generateDeviceIdentity()]);
    const enrollment = join(dir, 'devices.json');
    writeFileSync(enrollment, JSON.stringify([devA, devB].map((d) => ({ deviceId: d.nodeId, publicJwk: d.publicJwk }))));
    const port = await freePort();
    const base = `http://127.0.0.1:${port}/api/v1`;
    const hub = await startHub(join(dir, 'data'), enrollment, port);

    const key = await generateDataKey(false);
    const url = `ws://127.0.0.1:${port}/ws/sync`;
    const a = new Tablet(devA, key, url);
    const b = new Tablet(devB, key, url);
    a.client.start();
    b.client.start();
    await until(() => a.client.status === 'online' && b.client.status === 'online');

    for (let i = 0; i < 3; i++) await a.write(meas(100 + i, 118 + i));
    await until(() => b.envs.size === 3); // star relay through the hub

    hub.kill('SIGKILL'); // hub crash: tablets stay autonomous
    await until(() => a.client.status !== 'online' && b.client.status !== 'online');
    for (let i = 0; i < 4; i++) await a.write(meas(110 + i, 120 + i));
    for (let i = 0; i < 2; i++) await b.write({ t: 'pn', key: 'xp:C001', delta: 10 * (i + 1) });

    await startHub(join(dir, 'data'), enrollment, port); // Op-Log reloaded from disk (killed in afterAll)
    a.client.notifyOnline();
    b.client.notifyOnline();
    const ms = await until(() => a.envs.size === 9 && b.envs.size === 9);
    expect(ms).toBeLessThan(3000); // AC-TECH-04
    expect([...a.envs.keys()].sort()).toEqual([...b.envs.keys()].sort());

    // A brand-new tablet pages GET /sync/deltas?since_hlc= and recovers everything (issue #12 DoD).
    const got: Envelope[] = [];
    let since = '';
    for (;;) {
      const page = (await (await fetch(`${base}/sync/deltas?limit=4&since_hlc=${encodeURIComponent(since)}`)).json()) as { envelopes: Envelope[] };
      if (!page.envelopes.length) break;
      got.push(...page.envelopes);
      since = page.envelopes.at(-1)!.hlc;
    }
    expect(got.map((e) => e.id).sort()).toEqual([...a.envs.keys()].sort());
    expect(got).toEqual(got.map((e) => a.envs.get(e.id))); // byte-identical envelopes

    const health = (await (await fetch(`${base}/health`)).json()) as { status: string; oplogSequence: number };
    expect(health).toMatchObject({ status: 'ONLINE', oplogSequence: 9 });
    // Public cabin snapshot (ADR-014) published by a tablet and served to bulkhead displays.
    expect((await fetch(`${base}/habitat/status`)).status).toBe(503);
    const cabin = {
      updatedAtHlc: a.envs.values().next().value!.hlc,
      habitat: { missionDay: 120, ppCo2Mmhg: 1.6, cabinPressureKpa: 101.3, o2Percent: 20.9, radiationUSvH: 24 },
      crewTrafficLights: [{ crewId: 'C001', globalStatus: 'CAUTION' as const, hasUnacknowledgedCritical5Min: false }],
    };
    a.client.publishCabinStatus(cabin);
    await until(async () => (await fetch(`${base}/habitat/status`)).status === 200);
    expect(await (await fetch(`${base}/habitat/status`)).json()).toEqual(cabin);

    a.client.stop();
    b.client.stop();
  }, 20_000);

  it('status semantics: an unenrolled device shows `unauthorized` (never a flapping `online`) and backs off; auto-enroll admits it', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'astha-hub-status-'));
    const [known, stranger] = await Promise.all([generateDeviceIdentity(), generateDeviceIdentity()]);
    const enrollment = join(dir, 'devices.json');
    writeFileSync(enrollment, JSON.stringify([{ deviceId: known.nodeId, publicJwk: known.publicJwk }]));
    const port = await freePort();
    const hub = await startHub(join(dir, 'data'), enrollment, port);
    const url = `ws://127.0.0.1:${port}/ws/sync`;
    const key = await generateDataKey(false);

    const track = (t: Tablet) => {
      const seen: string[] = [];
      const orig = (t.client as unknown as { o: { onStatus?: (s: string) => void } }).o;
      orig.onStatus = (s) => seen.push(s);
      return seen;
    };
    const k = new Tablet(known, key, url);
    const x = new Tablet(stranger, key, url, { base: 2000, max: 300_000 }); // the app's real backoff
    const ks = track(k);
    const xs = track(x);
    k.client.start();
    x.client.start();
    await new Promise((r) => setTimeout(r, 2600));
    expect(ks).toEqual(['connecting', 'online']); // stable
    expect(xs).not.toContain('online'); // no false "online" flashes
    expect(xs.filter((s) => s === 'unauthorized').length).toBeGreaterThanOrEqual(1);
    // Real backoff: attempts at ~0 s and ~2 s, then 4 s, 8 s… (the old client reconnected every 2 s forever).
    expect(xs.filter((s) => s === 'connecting').length).toBe(2);
    expect((x.client as unknown as { attempt: number }).attempt).toBeGreaterThanOrEqual(2);
    x.client.stop();
    k.client.stop();
    hub.kill('SIGKILL');

    // Same stranger against a hub in auto-enroll mode: admitted, stays online, persisted to devices.json.
    const port2 = await freePort();
    await startHub(join(dir, 'data2'), enrollment, port2, ['--auto-enroll']);
    const x2 = new Tablet(stranger, key, `ws://127.0.0.1:${port2}/ws/sync`);
    const xs2 = track(x2);
    x2.client.start();
    await until(() => x2.client.status === 'online');
    await new Promise((r) => setTimeout(r, 500));
    expect(xs2).toEqual(['connecting', 'online']);
    const { readFileSync } = await import('node:fs');
    expect(readFileSync(enrollment, 'utf8')).toContain(stranger.nodeId);
    x2.client.stop();
  }, 20_000);
});
