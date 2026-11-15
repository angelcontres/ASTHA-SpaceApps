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

/** Contract version of the outer package (openapi.yaml → SignedDsnExport). */
export const DSN_SCHEMA_VERSION = 'astha-dsn-v1.0';
export const MISSION_ID = 'DST-1-MARS-TRANSIT';

/**
 * Signed package for the DTN router (openapi.yaml `SignedDsnExport`, ADR-010, RNF-NET-04, AC-TECH-05).
 * The signature covers the canonical JSON of every field except `ed25519Signature` itself, so header fields
 * (anonymization flag, signer, audit-chain tip) cannot be altered without invalidating it.
 * If the browser lacks Ed25519, the device signs with ECDSA P-256 and `signature.alg` says so (ADR-006).
 */
export interface SignedExport {
  exportSchemaVersion: typeof DSN_SCHEMA_VERSION;
  generatedAtUtc: string;
  missionId: string;
  isAnonymized: boolean;
  signerDeviceId: string;
  /** SHA-256 of the newest entry of the signer's append-only audit chain (RNF-SEC-04). */
  auditChainTipSha256: string;
  payload: ExportPayload;
  payloadSha256: string;
  signature: { alg: SignAlg; publicJwk: JsonWebKey };
  ed25519Signature: string;
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

function signedPart(doc: Omit<SignedExport, 'ed25519Signature'>): Uint8Array<ArrayBuffer> {
  const { exportSchemaVersion, generatedAtUtc, missionId, isAnonymized, signerDeviceId, auditChainTipSha256, payload, payloadSha256, signature } = doc;
  return utf8(canonicalJson({ exportSchemaVersion, generatedAtUtc, missionId, isAnonymized, signerDeviceId, auditChainTipSha256, payload, payloadSha256, signature }));
}

export async function signExport(payload: ExportPayload, device: DeviceIdentity, auditChainTipSha256: string): Promise<SignedExport> {
  const unsigned: Omit<SignedExport, 'ed25519Signature'> = {
    exportSchemaVersion: DSN_SCHEMA_VERSION,
    generatedAtUtc: payload.generatedAt,
    missionId: MISSION_ID,
    isAnonymized: payload.anonymized,
    signerDeviceId: device.nodeId,
    auditChainTipSha256,
    payload,
    payloadSha256: await sha256(utf8(canonicalJson(payload))),
    signature: { alg: device.alg, publicJwk: device.publicJwk },
  };
  return { ...unsigned, ed25519Signature: await sign(device, signedPart(unsigned)) };
}

/** Verifies schema, payload digest, header consistency and signature. `trusted` pins the signer's public key. */
export async function verifyExport(doc: SignedExport, trusted?: JsonWebKey): Promise<boolean> {
  try {
    if (doc?.exportSchemaVersion !== DSN_SCHEMA_VERSION || doc.payload?.schema !== EXPORT_SCHEMA) return false;
    if (!/^[a-f0-9]{64}$/.test(doc.auditChainTipSha256)) return false;
    if (doc.isAnonymized !== doc.payload.anonymized || doc.generatedAtUtc !== doc.payload.generatedAt) return false;
    if ((await sha256(utf8(canonicalJson(doc.payload)))) !== doc.payloadSha256) return false;
    return await verify(doc.signature.alg, trusted ?? doc.signature.publicJwk, signedPart(doc), doc.ed25519Signature);
  } catch {
    return false;
  }
}

export function serialize(doc: SignedExport): string {
  return JSON.stringify(doc, null, 2);
}

/** gzip with the native CompressionStream (AC-TECH-05). Returns null where it is unsupported. */
export async function compress(text: string): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null;
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** File handed to the DTN router: gzip-compressed signed JSON, or plain JSON where compression is unavailable. */
export async function packageForDsn(doc: SignedExport): Promise<{ fileName: string; text: string; gz: Uint8Array | null }> {
  const text = serialize(doc);
  const gz = await compress(text);
  const name = fileName(doc.payload);
  return { fileName: gz ? `${name}.gz` : name, text, gz };
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
