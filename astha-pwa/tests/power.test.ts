// Modo batería crítica automático (AC-TECH-02 §3, ADR-019 enmendado).
import { describe, expect, it } from 'vitest';
import { LOW_ENTER, LOW_EXIT, LOW_POWER_FRAME_MS, nextLowPower } from '../src/ui/bridge/powerPolicy';

const sig = (level: number | null, charging: boolean | null = false, simulated = false) => ({ level, charging, simulated });

describe('Política de batería crítica', () => {
  it('entra con ≤ 15 % sin cargar y repinta la telemetría a 0,2 fps', () => {
    expect(LOW_ENTER).toBe(0.15);
    expect(LOW_POWER_FRAME_MS).toBe(5000);
    expect(nextLowPower(false, sig(0.15))).toBe(true);
    expect(nextLowPower(false, sig(0.16))).toBe(false);
  });

  it('histéresis: entre 15 % y 20 % mantiene el estado anterior; sale con ≥ 20 %', () => {
    expect(nextLowPower(true, sig(0.18))).toBe(true);
    expect(nextLowPower(false, sig(0.18))).toBe(false);
    expect(nextLowPower(true, sig(LOW_EXIT))).toBe(false);
  });

  it('cargar desactiva el modo aunque el nivel sea bajo', () => {
    expect(nextLowPower(true, sig(0.05, true))).toBe(false);
  });

  it('sin Battery Status API no se activa solo; la señal simulada (EPS) siempre lo activa', () => {
    expect(nextLowPower(false, sig(null, null))).toBe(false);
    expect(nextLowPower(false, sig(null, null, true))).toBe(true);
    expect(nextLowPower(false, sig(0.9, true, true))).toBe(true);
  });
});
