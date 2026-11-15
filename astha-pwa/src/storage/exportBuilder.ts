// Exportación firmada para el Flight Surgeon (RF-ING-06, RF-REG-02, RF-GUI-05, RNF-NET-04, ADR-010).
// JSON con esquema derivado de SRS §5.1, firmado con la clave Ed25519 del dispositivo.
// La compresión gzip (CompressionStream nativo) es opcional; el empaquetado DTN queda fuera del sistema.
import type { Alert, Assessment, DailyMeasurement, HabitatRecord } from '../engine/types';
import { canonicalJson, sha256, sign, utf8, verify, type DeviceIdentity, type SignAlg } from './crypto';
import type { DecryptedEntry } from './ledger';

export const EXPORT_SCHEMA = 'astha.export/1';

export interface ExportCrew { id: string; name: string; role: string }

export interface ExportPayload {
  schema: typeof EXPORT_SCHEMA;
  kind: 'history' | 'summary';
  generatedAt: string;
  missionDay: number;
  anonymized: boolean;
  crew: ExportCrew[];
  /** Resumen asíncrono (RF-REG-02): estado, alertas activas con lo que hay que enviar (RF-GUI-05) y tendencias. */
  summary: {
    crewId: string;
    global: string;
    alerts: (Pick<Alert, 'ruleId' | 'organ' | 'status' | 'urgency' | 'values' | 'threshold' | 'explanation'> & { fsMessage?: string })[];
    trends: { indicator: string; value: number | null; slopePerDay: number | null; daysToCaution: number | null; zMod: number | null }[];
  }[];
  /** Historial (RF-ING-06): mediciones diarias, hábitat y bitácora. Vacío en kind = 'summary'. */
  measurements: DailyMeasurement[];
  habitat: HabitatRecord[];
  ledger: { hlc: string; type: string; crewId: string | null; detail: string | null }[];
}

export interface SignedExport {
  payload: ExportPayload;
  payloadSha256: string;
  signature: { alg: SignAlg; nodeId: string; publicJwk: JsonWebKey; value: string };
}

export interface ExportInput {
  kind: 'history' | 'summary';
  missionDay: number;
  crew: ExportCrew[];
  assessments: Assessment[];
  measurements: DailyMeasurement[];
  habitat: HabitatRecord[];
  ledger: DecryptedEntry[];
  fsMessages: Record<string, string | undefined>;
  /** Para usos no médicos (ADR-012): sustituye nombres por el id. */
  anonymize?: boolean;
  now?: Date;
}

export function buildPayload(i: ExportInput): ExportPayload {
  const crew = i.crew.map((c) => (i.anonymize ? { id: c.id, name: c.id, role: c.role } : c));
  return {
    schema: EXPORT_SCHEMA,
    kind: i.kind,
    generatedAt: (i.now ?? new Date()).toISOString(),
    missionDay: i.missionDay,
    anonymized: !!i.anonymize,
    crew,
    summary: i.assessments
      .filter((a) => !a.statusOnly)
      .map((a) => ({
        crewId: a.crewId,
        global: a.global,
        alerts: a.alerts.map((x) => ({
          ruleId: x.ruleId, organ: x.organ, status: x.status, urgency: x.urgency, values: x.values,
          threshold: x.threshold, explanation: x.explanation,
          ...(x.status === 'critical' && i.fsMessages[x.countermeasureId] ? { fsMessage: i.fsMessages[x.countermeasureId] } : {}),
        })),
        trends: a.indicators.map((ind) => ({
          indicator: ind.id, value: ind.value, slopePerDay: ind.slope, daysToCaution: ind.daysToCaution, zMod: ind.z,
        })),
      })),
    measurements: i.kind === 'history' ? i.measurements : [],
    habitat: i.kind === 'history' ? i.habitat : [],
    ledger: i.kind === 'history'
      ? i.ledger.map((e) => ({ hlc: e.hlc, type: e.type, crewId: e.crewId, detail: i.anonymize ? null : e.detail }))
      : [],
  };
}

export async function signExport(payload: ExportPayload, device: DeviceIdentity): Promise<SignedExport> {
  const bytes = utf8(canonicalJson(payload));
  return {
    payload,
    payloadSha256: await sha256(bytes),
    signature: { alg: device.alg, nodeId: device.nodeId, publicJwk: device.publicJwk, value: await sign(device, bytes) },
  };
}

export async function verifyExport(doc: SignedExport, trusted?: JsonWebKey): Promise<boolean> {
  if (doc?.payload?.schema !== EXPORT_SCHEMA) return false;
  const bytes = utf8(canonicalJson(doc.payload));
  if ((await sha256(bytes)) !== doc.payloadSha256) return false;
  const key = trusted ?? doc.signature.publicJwk;
  return verify(doc.signature.alg, key, bytes, doc.signature.value);
}

export function serialize(doc: SignedExport): string {
  return JSON.stringify(doc, null, 2);
}

/** gzip opcional con CompressionStream nativo. Devuelve null si el entorno no lo soporta. */
export async function compress(text: string): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null;
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export function fileName(p: ExportPayload): string {
  return `astha-${p.kind}-dia${String(p.missionDay).padStart(3, '0')}-${p.generatedAt.slice(0, 10)}.json`;
}

/** Importación (RF-ING-06): solo acepta paquetes con firma válida. */
export async function parseImport(text: string, trusted?: JsonWebKey): Promise<ExportPayload | null> {
  try {
    const doc = JSON.parse(text) as SignedExport;
    return (await verifyExport(doc, trusted)) ? doc.payload : null;
  } catch {
    return null;
  }
}
