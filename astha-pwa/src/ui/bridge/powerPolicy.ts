// Política del modo batería crítica automático (AC-TECH-02 §3, CU-12, ADR-019 enmendado). Funciones puras.

/** Entra en modo batería crítica con ≤ 15 % sin cargar (docs/Diseno-UI-UX). */
export const LOW_ENTER = 0.15;
/** Sale con ≥ 20 % (histéresis para no oscilar alrededor del umbral) o al conectar el cargador. */
export const LOW_EXIT = 0.2;
/** Repintado de telemetría no urgente: 1 cada 5 s (0,2 fps, AC-TECH-02 §3). */
export const LOW_POWER_FRAME_MS = 5000;

export interface PowerSignal {
  /** 0..1, o null si el navegador no expone la batería. */
  level: number | null;
  charging: boolean | null;
  /** Señal crítica de batería simulada (demostración / futura señal EPS por el Hub). */
  simulated: boolean;
}

export function nextLowPower(prev: boolean, s: PowerSignal): boolean {
  if (s.simulated) return true;
  if (s.level === null) return false;
  if (s.charging) return false;
  if (s.level <= LOW_ENTER) return true;
  if (s.level >= LOW_EXIT) return false;
  return prev;
}
