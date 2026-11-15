// RF-GUI-01..05: resuelve los 3 bloques, verifica ≤ 4 pasos (ADR-017) y que cada recurso esté en el inventario de a bordo (RF-GUI-03).
import catalog from '../data/countermeasures.json';
import type { Protocol } from './types';

type RawProtocol = Omit<Protocol, 'id' | 'resources'>;
type Catalog = { maxSteps: number; inventory: Record<string, string>; protocols: Record<string, RawProtocol> };
export const CATALOG = catalog as unknown as Catalog;

export class CountermeasureError extends Error {}

export function validateProtocol(id: string, p: RawProtocol, cat: Catalog = CATALOG): Protocol {
  if (p.steps.length === 0 || p.steps.length > cat.maxSteps) {
    throw new CountermeasureError(`${id}: ${p.steps.length} pasos (máximo ${cat.maxSteps}, ADR-017)`);
  }
  const resources = [...new Set(p.steps.map((s) => s.resource).filter((r): r is string => !!r))];
  for (const r of resources) {
    if (!(r in cat.inventory)) throw new CountermeasureError(`${id}: recurso "${r}" no está a bordo (RF-GUI-03)`);
  }
  return { id, ...p, resources };
}

/** Valida todo el catálogo una vez: un protocolo inválido nunca llega a la UI. */
export function validateCatalog(cat: Catalog = CATALOG): Map<string, Protocol> {
  const out = new Map<string, Protocol>();
  for (const [id, p] of Object.entries(cat.protocols)) out.set(id, validateProtocol(id, p, cat));
  return out;
}

let cache: Map<string, Protocol> | null = null;

export function resolveProtocol(id: string): Protocol | null {
  cache ??= validateCatalog();
  return cache.get(id) ?? null;
}

export function inventoryLabel(id: string): string {
  return CATALOG.inventory[id] ?? id;
}
