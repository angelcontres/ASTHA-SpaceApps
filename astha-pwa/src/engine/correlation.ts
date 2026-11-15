// RF-EVA-04: reglas de correlación ambiental-fisiológica (SRS §6.2) evaluadas como predicados de datos.
import rules from '../data/rules.json';
import type { OrganSystem, Status, SymptomType, Urgency } from './types';

export type Condition =
  | { var: string; op: '>' | '<' | '>=' | '<='; value: number }
  | { symptom: SymptomType };

export interface CorrelationRule {
  id: string;
  organ: OrganSystem;
  status: Status;
  urgency: Urgency;
  all: Condition[];
  summary: string;
  countermeasureId: string;
  supersedes?: string[];
}

export const CORRELATION_RULES = rules.correlation as CorrelationRule[];

export interface CorrelationHit {
  rule: CorrelationRule;
  values: Record<string, number | string>;
  threshold: string;
}

const SYMPTOM_LABEL: Record<SymptomType, string> = {
  blurred_vision: 'blurred vision',
  headache: 'headache',
  nausea: 'nausea',
  back_pain: 'lumbar pain',
  orthostatic_dizziness: 'orthostatic dizziness',
};

function test(v: number, op: string, ref: number): boolean {
  switch (op) {
    case '>': return v > ref;
    case '<': return v < ref;
    case '>=': return v >= ref;
    case '<=': return v <= ref;
    default: return false;
  }
}

export function evaluateCorrelations(
  values: Record<string, number | null>,
  symptoms: readonly SymptomType[],
  table: CorrelationRule[] = CORRELATION_RULES,
): CorrelationHit[] {
  const hits: CorrelationHit[] = [];
  for (const rule of table) {
    const vals: Record<string, number | string> = {};
    const parts: string[] = [];
    let ok = true;
    for (const c of rule.all) {
      if ('symptom' in c) {
        if (!symptoms.includes(c.symptom)) { ok = false; break; }
        vals[c.symptom] = 'reported';
        parts.push(SYMPTOM_LABEL[c.symptom]);
      } else {
        const v = values[c.var];
        if (v == null || !test(v, c.op, c.value)) { ok = false; break; }
        vals[c.var] = v;
        parts.push(`${c.var} ${c.op} ${String(c.value)}`);
      }
    }
    if (ok) hits.push({ rule, values: vals, threshold: parts.join(' and ') });
  }
  // Una regla más específica sustituye a la general (R-RAD-02 ⊃ R-RAD-01, R-REN-01 ⊃ R-REN-02).
  const superseded = new Set(hits.flatMap((h) => h.rule.supersedes ?? []));
  return hits.filter((h) => !superseded.has(h.rule.id));
}
