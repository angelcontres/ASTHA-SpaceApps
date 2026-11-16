// Shared crew keys across devices (ADR-020 stand-in): envelopes synced through the hub must be readable on the
// other devices of the crew, while each device still wraps the keys under its own PIN-derived KEKs (ADR-012).
import { describe, expect, it } from 'vitest';
import { decryptJson, encryptJson, MISSION_PROVISIONING, provisionKeyring, unlockKeyring } from '../src/storage/crypto';
import { SYNTHETIC } from '../src/storage/telemetrySources';

const CREW = SYNTHETIC.crew.map((c) => ({ personId: c.id, pin: c.pin }));
const CMO = SYNTHETIC.crew.find((c) => c.role === 'cmo')!.id;
const ITER = 1_000;

describe('mission-secret provisioning', () => {
  it("two devices with the same mission secret read each other's envelopes; per-device wrapping still differs", async () => {
    const tabletA = await provisionKeyring(CREW, CMO, ITER, 'mission-x');
    const tabletB = await provisionKeyring(CREW, CMO, ITER, 'mission-x');
    expect(tabletA.provisioning).toBe(MISSION_PROVISIONING);
    expect(tabletA.salts.C001).not.toBe(tabletB.salts.C001); // independent PIN salts / wrapping per device
    const a = await unlockKeyring(tabletA, 'C001', '1001');
    const b = await unlockKeyring(tabletB, CMO, '1002'); // the CMO console on another device
    const sealed = await encryptJson(a.keys.get('C001')!, { sbp: 144 });
    expect(await decryptJson(b.keys.get('C001')!, sealed.iv, sealed.ct)).toEqual({ sbp: 144 });
    const hab = await encryptJson(a.keys.get('hab')!, { ppco2: 3.6 });
    expect(await decryptJson(tabletB.habDeviceKey, hab.iv, hab.ct)).toEqual({ ppco2: 3.6 }); // cabin display
  });

  it("RBAC holds across devices: an astronaut still cannot unwrap another crew member's key", async () => {
    const ring = await provisionKeyring(CREW, CMO, ITER, 'mission-x');
    const s = await unlockKeyring(ring, 'C001', '1001');
    expect([...s.keys.keys()].sort()).toEqual(['C001', 'hab']);
  });

  it('a different mission secret (or legacy random provisioning) cannot read the data', async () => {
    const a = await unlockKeyring(await provisionKeyring(CREW, CMO, ITER, 'mission-x'), 'C001', '1001');
    const other = await unlockKeyring(await provisionKeyring(CREW, CMO, ITER, 'mission-y'), 'C001', '1001');
    const legacy = await provisionKeyring(CREW, CMO, ITER);
    expect(legacy.provisioning).toBe('random');
    const sealed = await encryptJson(a.keys.get('C001')!, { sbp: 120 });
    await expect(decryptJson(other.keys.get('C001')!, sealed.iv, sealed.ct)).rejects.toThrow();
    const l = await unlockKeyring(legacy, 'C001', '1001');
    await expect(decryptJson(l.keys.get('C001')!, sealed.iv, sealed.ct)).rejects.toThrow();
  });
});
