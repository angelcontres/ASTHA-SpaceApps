// RF-EVA-03 y RF-EVA-02: 7 sistemas → 5 regiones; estado global = el peor (indicadores y reglas activas).
import organs from '../data/organs.json';
import {
  REGION_IDS, worst,
  type Alert, type IndicatorId, type IndicatorState, type OrganSystem, type RegionId, type RegionState, type StatusOrNone,
} from './types';

type OrgansData = {
  regions: Record<RegionId, { label: string; order: number; anchor: number[] }>;
  systems: Record<OrganSystem, { label: string; region: RegionId }>;
  indicators: Record<IndicatorId, { system: OrganSystem; region?: RegionId }>;
};
export const ORGANS = organs as unknown as OrgansData;

export function regionOfSystem(system: OrganSystem): RegionId {
  return ORGANS.systems[system].region;
}

export function mapIndicator(id: IndicatorId): { system: OrganSystem; region: RegionId } {
  const m = ORGANS.indicators[id];
  return { system: m.system, region: m.region ?? regionOfSystem(m.system) };
}

export function aggregateRegions(
  indicators: IndicatorState[],
  alerts: Alert[],
): { regions: Record<RegionId, RegionState>; global: StatusOrNone } {
  const regions = Object.fromEntries(
    REGION_IDS.map((r) => [r, { status: 'none', alertCount: 0, isSuspect: false } as RegionState]),
  ) as Record<RegionId, RegionState>;

  for (const ind of indicators) {
    if (ind.status === 'none') continue;
    const r = regions[mapIndicator(ind.id).region];
    r.status = worst(r.status, ind.status);
  }
  for (const a of alerts) {
    const r = regions[a.region];
    r.status = worst(r.status, a.status);
    if (a.status !== 'nominal') r.alertCount++;
    if (a.isSuspect) r.isSuspect = true;
  }
  let global: StatusOrNone = 'none';
  for (const id of REGION_IDS) global = worst(global, regions[id].status);
  return { regions, global };
}
