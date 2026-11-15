// Estado de navegación de la UI (solo presentación; los datos vienen siempre del Worker Bridge).
import organs from '../../data/organs.json';
import { CATALOG, resolveProtocol } from '../../engine/countermeasures';
import { mapIndicator } from '../../engine/organMapper';
import type { IndicatorId, RegionId, StatusOrNone, SymptomType } from '../../engine/types';

export type Tab = 'bio' | 'env' | 'triage' | 'sim';

class UiState {
  tab = $state<Tab>('bio');
  /** Alerta cuya contramedida está abierta (emergencia, banner, región). */
  openAlertId = $state<string | null>(null);
  selectedRegion = $state<RegionId | null>(null);
  bioIndicator = $state<IndicatorId>('sbp');
  envIndicator = $state<IndicatorId>('ppco2');
  view = $state<'front' | 'back'>('front');
  settingsOpen = $state(false);
  /** Vista B (Código Rojo a pantalla completa) abierta para esta alerta. */
  codeRedId = $state<string | null>(null);
  /** Vista B cerrada a mano por el usuario: no se reabre sola para la misma alerta. */
  codeRedDismissed = $state<string[]>([]);

  /** Abre el protocolo de una alerta en 1 toque (RNF-USA-02). */
  openProtocol(alertId: string, region?: RegionId) {
    this.openAlertId = alertId;
    if (region) this.selectedRegion = region;
    this.tab = 'triage';
  }
}

export const ui = new UiState();

export const STATUS_LABEL: Record<StatusOrNone, string> = {
  nominal: 'Nominal', caution: 'Precaución', critical: 'Crítico', none: 'Sin datos',
};

export const ROLE_LABEL: Record<string, string> = {
  commander: 'Comandante', cmo: 'CMO', engineer: 'Ingeniero de vuelo', specialist: 'Especialista',
};

export const REGION_LABEL = Object.fromEntries(
  Object.entries(organs.regions).map(([k, v]) => [k, v.label]),
) as Record<RegionId, string>;

export const SYSTEM_LABEL = Object.fromEntries(
  Object.entries(organs.systems).map(([k, v]) => [k, v.label]),
) as Record<string, string>;

export const SYMPTOM_LABEL = Object.fromEntries(
  Object.entries(organs.symptoms).map(([k, v]) => [k, v.label]),
) as Record<SymptomType, string>;

export const regionOfIndicator = (id: IndicatorId): RegionId => mapIndicator(id).region;

export { CATALOG, resolveProtocol };

/** Formato numérico con coma decimal. */
export function fmt(v: number | null | undefined, decimals = 0): string {
  return v == null || Number.isNaN(v) ? '—' : v.toFixed(decimals).replace('.', ',');
}

/** Día de misión con el prefijo de vuelo de los wireframes (FD-120). */
export const fd = (day: number) => `FD-${String(day).padStart(3, '0')}`;
