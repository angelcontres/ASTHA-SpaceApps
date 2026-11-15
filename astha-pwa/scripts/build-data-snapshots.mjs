// Builds the reduced offline snapshots bundled with the PWA from the repository's reference data (issue #7).
//   ../data/human_telemetry_astronauts.json        → src/data/reference_telemetry_90d.json (numeric fields only)
//   ../data/nasa_osdr_api_human_studies.json (+ enriched) → src/data/osdr_studies.json
// Run with `npm run data:snapshots` after the reference files change. Output is deterministic.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const write = (p, v) => writeFileSync(join(root, p), `${JSON.stringify(v, null, 1)}\n`);

// ---- 90-day reference telemetry (synthetic, calibrated against OSD-574; see data/README.md) ----
const telemetry = read('../data/human_telemetry_astronauts.json');
const records = telemetry
  .map((r) => ({
    subject: r.astronaut_id,
    day: r.mission_day,
    hr: r.heart_rate_bpm,
    hrv: r.hrv_rmssd_ms,
    sbp: r.systolic_bp_mmhg,
    dbp: r.diastolic_bp_mmhg,
    spo2: r.spo2_percent,
    glucose: r.blood_glucose_mg_dl,
    temp: r.body_temperature_c,
    sleep: r.sleep_hours,
    mood: r.mood_cognitive_score,
    radiation: r.radiation_dose_rate_usv_h,
  }))
  .sort((a, b) => a.subject.localeCompare(b.subject) || a.day - b.day);
write('src/data/reference_telemetry_90d.json', {
  _source: 'Reduced from data/human_telemetry_astronauts.json (synthetic, OSD-574-calibrated reference). Names, roles and free text removed. Not NASA-measured flight data.',
  subjects: [...new Set(records.map((r) => r.subject))],
  records,
});

// ---- NASA OSDR human studies (offline snapshot, RF-OFF) ----
const index = read('../data/nasa_osdr_api_human_studies.json');
const enriched = new Map(read('../data/nasa_osdr_enriched_human_studies.json').map((s) => [s.accession, s]));
const studies = index
  .map((s) => {
    const accession = s['id.accession'];
    const e = enriched.get(accession);
    const assays = e ? [].concat(e.assay_type ?? []).filter(Boolean) : [];
    return {
      accession,
      organism: s['study.characteristics.organism'] ?? null,
      ...(e ? { title: e.title, mission: e.mission || null, flightProgram: e.flight_program || null, assays } : {}),
    };
  })
  .sort((a, b) => Number(a.accession.split('-')[1]) - Number(b.accession.split('-')[1]));
write('src/data/osdr_studies.json', {
  _source: 'Offline snapshot of data/nasa_osdr_api_human_studies.json enriched with data/nasa_osdr_enriched_human_studies.json. No network access at runtime.',
  count: studies.length,
  studies,
});
console.log(`reference records: ${records.length}, OSDR studies: ${studies.length} (${studies.filter((s) => s.title).length} with details)`);
