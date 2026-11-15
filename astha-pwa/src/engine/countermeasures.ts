// CounterResolver (SDD-04, issue #6) · RF-GUI-01..05, ADR-017, AC-CLIN-06, CU-07.
// Resuelve el protocolo de 3 bloques de cada alerta y valida el catálogo completo antes de que llegue a la UI:
//   · 1 a 4 pasos accionables (ADR-017); los procedimientos más largos se encadenan con `next`.
//   · solo recursos del inventario de a bordo (RF-GUI-03) y ninguno que no exista en una nave (AC-CLIN-06.3).
//   · lenguaje no médico: toda sigla de los bloques que lee la tripulación está en el glosario (RF-GUI-04).
//   · bloque 1 ≤ 300 caracteres y bloque 2 ≤ 200 (Diccionario de Datos §6).
//   · si un recurso no está operativo, devuelve el protocolo alternativo declarado (CU-07 FA-01).
// El bloque técnico (fsMessage, RF-GUI-05) es para el Flight Surgeon y puede usar terminología médica.
import catalog from '../data/countermeasures.json';
import type { Alert, Protocol, Status, Urgency } from './types';

type RawProtocol = Omit<Protocol, 'id' | 'resources'>;
interface Catalog {
  maxSteps: number;
  inventory: Record<string, string>;
  glossary: Record<string, string>;
  forbidden: string[];
  protocols: Record<string, RawProtocol>;
}
export const CATALOG = catalog as unknown as Catalog;

export const MAX_WHAT_CHARS = 300;
export const MAX_SEVERITY_CHARS = 200;

export class CountermeasureError extends Error {}

/** Siglas y fórmulas (CO₂, LBNP, LiOH…) que aparecen en un texto. Los ids de regla (R-RAD-01) no cuentan. */
export function termsIn(text: string): string[] {
  const clean = text.replace(/\b[RD]-[A-Z]+-\d+\b|\bD-\d+\b/g, '');
  return [...new Set(clean.match(/\b(?:[A-Z][A-Za-z]*[A-Z][A-Za-z0-9₂]*|[A-Z][a-z]?[A-Z₂]+[0-9₂]*|[A-Z]+[₂])/g) ?? [])];
}

function crewText(p: RawProtocol): string[] {
  return [p.title, p.what, p.severity, p.timeToImpact, ...p.steps.map((s) => s.text)];
}

export function validateProtocol(id: string, p: RawProtocol, cat: Catalog = CATALOG): Protocol {
  const fail = (why: string) => { throw new CountermeasureError(`${id}: ${why}`); };
  if (p.steps.length === 0 || p.steps.length > cat.maxSteps) fail(`${p.steps.length} pasos (máximo ${cat.maxSteps}, ADR-017)`);
  if (new Set(p.steps.map((s) => s.id)).size !== p.steps.length) fail('ids de paso repetidos');
  if (p.what.length > MAX_WHAT_CHARS) fail(`bloque 1 de ${p.what.length} caracteres (máximo ${MAX_WHAT_CHARS})`);
  const sev = `${p.severity} · ${p.timeToImpact}`;
  if (sev.length > MAX_SEVERITY_CHARS) fail(`bloque 2 de ${sev.length} caracteres (máximo ${MAX_SEVERITY_CHARS})`);

  const resources = [...new Set(p.steps.map((s) => s.resource).filter((r): r is string => !!r))];
  for (const r of resources) if (!(r in cat.inventory)) fail(`recurso "${r}" no está a bordo (RF-GUI-03)`);

  for (const text of crewText(p)) {
    const lower = text.toLowerCase();
    for (const word of cat.forbidden) if (lower.includes(word)) fail(`recurso inexistente a bordo: "${word}" (AC-CLIN-06)`);
    for (const term of termsIn(text)) if (!(term in cat.glossary)) fail(`término "${term}" sin definir en el glosario (RF-GUI-04)`);
  }
  return { id, ...p, resources };
}

/** Valida todo el catálogo una vez: un protocolo inválido nunca llega a la UI. */
export function validateCatalog(cat: Catalog = CATALOG): Map<string, Protocol> {
  const out = new Map<string, Protocol>();
  for (const [id, p] of Object.entries(cat.protocols)) out.set(id, validateProtocol(id, p, cat));
  for (const p of out.values()) {
    // Encadenamiento (ADR-017): destino existente y sin ciclos.
    const seen = new Set([p.id]);
    for (let n = p.next; n; n = out.get(n)?.next) {
      if (!out.has(n)) throw new CountermeasureError(`${p.id}: protocolo encadenado "${n}" no existe`);
      if (seen.has(n)) throw new CountermeasureError(`${p.id}: ciclo en el encadenamiento`);
      seen.add(n);
    }
    // Alternativas (CU-07 FA-01): el sustituto existe y no usa el recurso que sustituye.
    for (const [res, alt] of Object.entries(p.alternatives ?? {})) {
      const a = out.get(alt);
      if (!a) throw new CountermeasureError(`${p.id}: alternativa "${alt}" no existe`);
      if (!p.resources.includes(res)) throw new CountermeasureError(`${p.id}: alternativa para "${res}", que no usa`);
      if (a.resources.includes(res)) throw new CountermeasureError(`${p.id}: la alternativa ${alt} también usa "${res}"`);
    }
  }
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

export function glossaryEntry(term: string): string | null {
  return CATALOG.glossary[term] ?? null;
}

export type Priority = 'high' | 'medium' | 'low';

/** Insignia de prioridad del bloque 2 (AC-CLIN-06): Alta, Media o Baja. */
export function priorityOf(status: Status, urgency: Urgency): Priority {
  if (status === 'critical' || urgency === 'emergency') return 'high';
  if (urgency === 'high') return 'medium';
  return 'low';
}

/** Prefijo de los pasos con los que la tripulación marca un recurso como no operativo (G-Set, como los checks). */
export const UNAVAILABLE_PREFIX = 'unavailable:';

export interface Resolution {
  protocol: Protocol;
  priority: Priority;
  /** Protocolo original cuando se sustituyó por falta de un recurso. */
  original: Protocol | null;
  /** Recurso que motivó la sustitución. */
  substitutedFor: string | null;
  /** Protocolos encadenados que siguen al terminar este (ADR-017). */
  chain: Protocol[];
}

/** Recursos marcados como no operativos en los pasos registrados de una alerta. */
export function unavailableFrom(completedSteps: readonly string[]): Set<string> {
  return new Set(completedSteps.filter((s) => s.startsWith(UNAVAILABLE_PREFIX)).map((s) => s.slice(UNAVAILABLE_PREFIX.length)));
}

/** Resuelve el protocolo de una alerta, con alternativa si falta un recurso y la cadena siguiente. */
export function resolveForAlert(
  alert: Pick<Alert, 'countermeasureId' | 'status' | 'urgency'>,
  unavailable: ReadonlySet<string> = new Set(),
): Resolution | null {
  const base = resolveProtocol(alert.countermeasureId);
  if (!base) return null;
  let protocol = base;
  let substitutedFor: string | null = null;
  for (const res of base.resources) {
    const alt = unavailable.has(res) ? base.alternatives?.[res] : undefined;
    const p = alt ? resolveProtocol(alt) : null;
    if (p) { protocol = p; substitutedFor = res; break; }
  }
  const chain: Protocol[] = [];
  for (let n = protocol.next; n; n = resolveProtocol(n)?.next) {
    const p = resolveProtocol(n);
    if (p) chain.push(p);
  }
  return { protocol, priority: priorityOf(alert.status, alert.urgency), original: substitutedFor ? base : null, substitutedFor, chain };
}
