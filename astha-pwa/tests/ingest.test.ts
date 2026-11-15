// Issue #7 [Data-03] — `POST /ingest/telemetry` adapter (openapi.yaml, SRS §5.2, RF-ING-05), offline load of the
// bundled 90-day reference telemetry, and the NASA OSDR offline snapshot.
import { describe, expect, it } from 'vitest';
import osdr from '../src/data/osdr_studies.json';
import reference from '../src/data/reference_telemetry_90d.json';
import { evaluate } from '../src/engine/pipeline';
import type { Op } from '../src/storage/crdt';
import { adaptIngest, adaptReferenceDataset, type ReferenceDataset } from '../src/storage/ingestAdapter';
import { buildView, generateDataset, resetOp, SYNTHETIC } from '../src/storage/telemetrySources';

const CREW = SYNTHETIC.crew.map((c) => c.id);
const valid = () => ({
  crewId: 'C003',
  measurement: { missionDay: 48, hr: 114, hrvRmssd: 18.2, pas: 142, pad: 92, spo2: 93.1, glucose: 98, tempC: 37.1, sleepHours: 4.8, mood: 4 },
  habitat: { missionDay: 48, ppCo2Mmhg: 3.4, cabinPressureKpa: 101.2, o2Percent: 21.0, radiationUSvH: 28.5 },
  symptoms: ['blurredVision', 'headache'],
});

describe('POST /ingest/telemetry adapter', () => {
  it('maps the contract example (03-Contratos §3.1) onto internal measurement, habitat and symptom ops', () => {
    const r = adaptIngest(valid(), CREW);
    expect(r).toMatchObject({ ok: true, errors: [], suspect: [], unsupportedSymptoms: [] });
    expect(r.ops).toEqual([
      { t: 'measurement', crewId: 'C003', day: 48, source: 'import',
        fields: { hr: 114, hrv: 18.2, sbp: 142, dbp: 92, spo2: 93.1, glucose: 98, temp: 37.1, sleep: 4.8, mood: 4 } },
      { t: 'habitat', day: 48, source: 'import', fields: { ppco2: 3.4, pressure: 101.2, o2: 21, radiation: 28.5 } },
      { t: 'symptom', crewId: 'C003', day: 48, symptom: 'blurred_vision', active: true, source: 'import' },
      { t: 'symptom', crewId: 'C003', day: 48, symptom: 'headache', active: true, source: 'import' },
    ]);
  });

  it('RF-ING-05: out-of-range values are kept and flagged isSuspect, never discarded', () => {
    const body = valid();
    body.measurement.hr = 240; // > 220
    body.measurement.spo2 = 60; // < 65
    const r = adaptIngest(body, CREW);
    expect(r.ok).toBe(true);
    expect(r.suspect.sort()).toEqual(['hr', 'spo2']);
    expect(r.ops[0]).toMatchObject({ fields: { hr: 240, spo2: 60 } });
  });

  it('rejects contract violations without producing any op', () => {
    const missing = valid() as Record<string, unknown>;
    delete (missing.measurement as Record<string, unknown>).hr;
    const cases: unknown[] = [
      null, 'x', { ...valid(), crewId: 'C999' }, missing,
      { ...valid(), measurement: { ...valid().measurement, missionDay: 0 } },
      { ...valid(), habitat: { ...valid().habitat, o2Percent: 'high' } },
      { ...valid(), symptoms: ['sneezing'] },
    ];
    for (const c of cases) {
      const r = adaptIngest(c, CREW);
      expect(r.ok, JSON.stringify(c)).toBe(false);
      expect(r.ops).toEqual([]);
      expect(r.errors.length).toBeGreaterThan(0);
    }
  });

  it('accepts extremeFatigue from the contract but reports it as not yet modelled by the engine', () => {
    const r = adaptIngest({ ...valid(), symptoms: ['extremeFatigue', 'nausea'] }, CREW);
    expect(r.ok).toBe(true);
    expect(r.unsupportedSymptoms).toEqual(['extremeFatigue']);
    expect(r.ops.filter((o) => o.t === 'symptom')).toHaveLength(1);
  });

  it('ingested telemetry reaches the clinical engine (R-ENV-02 and R-SANS-01 from the contract example)', () => {
    const ds = generateDataset(SYNTHETIC);
    let t = 1;
    const ops: Op[] = adaptIngest(valid(), CREW).ops.map((body) => ({ id: `i${t}`, hlc: { wallMs: t++, counter: 0, nodeId: 'n' }, author: 'n', keyRef: 'hab', body }));
    const v = buildView(ds, ops, 48);
    const a = evaluate({ crewId: 'C003', day: 48, measurements: v.measurements.C003, habitat: v.habitat, symptoms: v.symptoms.C003 ?? [], statusOnly: false });
    expect(a.alerts.map((x) => x.ruleId)).toEqual(expect.arrayContaining(['R-ENV-02', 'R-SANS-01']));
  });
});

describe('Bundled reference dataset (offline load)', () => {
  const ref = reference as unknown as ReferenceDataset;

  it('90 days × 4 subjects, reduced to numeric fields (no names or free text)', () => {
    expect(ref.subjects).toHaveLength(4);
    expect(ref.records).toHaveLength(360);
    expect(new Set(ref.records.map((r) => r.day)).size).toBe(90);
    const text = JSON.stringify(reference);
    expect(text).not.toMatch(/Vance|Chen|Silva|Lefevre|astronaut_name|clinical_guidance/);
  });

  it('maps subjects onto C001..C004 with one measurement per day and a daily habitat radiation mean', () => {
    const imp = adaptReferenceDataset(ref, CREW);
    expect(imp.mapping).toEqual({ 'ASTRO-01': 'C001', 'ASTRO-02': 'C002', 'ASTRO-03': 'C003', 'ASTRO-04': 'C004' });
    expect(imp.measurements).toHaveLength(360);
    expect(imp.habitat).toHaveLength(90);
    for (const m of imp.measurements) expect(Number.isInteger(m.fields.mood) && m.fields.mood >= 1 && m.fields.mood <= 10).toBe(true);
  });

  it('imported data survives a simulator reset (only simulator injections are undone)', () => {
    const ds = generateDataset(SYNTHETIC);
    const imp = adaptReferenceDataset(ref, CREW);
    let t = 1;
    const asOp = (body: Op['body']): Op => ({ id: `r${t}`, hlc: { wallMs: t++, counter: 0, nodeId: 'n' }, author: 'n', keyRef: 'hab', body });
    const ops = [...imp.measurements, ...imp.habitat].map(asOp);
    ops.push(asOp(resetOp(90)));
    const v = buildView(ds, ops, 90);
    const day90 = ref.records.find((r) => r.subject === 'ASTRO-01' && r.day === 90)!;
    expect(v.measurements.C001.at(-1)!.hr).toBe(day90.hr);
    expect(v.habitat.at(-1)!.radiation).toBe(imp.habitat.at(-1)!.fields.radiation);
  });
});

describe('NASA OSDR offline snapshot', () => {
  it('indexes the human studies locally, with details for the key accessions and no URLs', () => {
    expect(osdr.count).toBe(116);
    const s574 = osdr.studies.find((s) => s.accession === 'OSD-574') as { title?: string } | undefined;
    expect(s574?.title).toMatch(/Inspiration4/);
    expect(JSON.stringify(osdr)).not.toMatch(/https?:\/\//);
  });
});
