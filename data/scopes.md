## Variables fisiológicas

## **heart_rate_bpm**

| origin | evidence_source | continuous_telemetry | data_availability | unit | nominal_range | alert_threshold | subject_type | access_level | authentication | data_quality | derivation_formula | cdss_field | confidence | clinical_use | diagnostic_use | justification | caveats |
|---|---|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `SYNTHETIC_OR_ANALOG_DERIVED` | `OSD study or publication` | `false` | `NOT_AVAILABLE_AS_CONTINUOUS_PUBLIC_TIME_SERIES` | `bpm` | `55–85 bpm` | `Sustained tachycardia or deviation from individual baseline` | `ASTRONAUT_OR_ANALOG` | `UNKNOWN` | `UNKNOWN` | `ASSAY_METADATA_OR_PUBLICATION` | `` | `vitals.heartRate` | `LOW` | `SUPPORTING_EVIDENCE_ONLY` | `false` | `Data proceeds from articles, tables, assay metadata or study results. No public continuous JSON/CSV telemetry stream was identified in OSDR.` | `Do not present synthetic values as NASA-measured astronaut telemetry.` |

## **hrv_rmssd_ms**

| origin | evidence_source | continuous_telemetry | data_availability | unit | nominal_range | alert_threshold | subject_type | access_level | authentication | data_quality | derivation_formula | cdss_field | confidence | clinical_use | diagnostic_use | justification | caveats |
|---|---|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `SYNTHETIC_OR_ANALOG_DERIVED` | `OSD study or publication` | `false` | `NOT_AVAILABLE_AS_CONTINUOUS_PUBLIC_TIME_SERIES` | `ms` | `35–70 ms` | `Sustained reduction relative to individual baseline` | `ASTRONAUT_OR_ANALOG` | `UNKNOWN` | `UNKNOWN` | `ASSAY_METADATA_OR_PUBLICATION` | `` | `vitals.hrv` | `LOW` | `SUPPORTING_EVIDENCE_ONLY` | `false` | `HRV is typically derived from ECG/PPG research recordings; it is unlikely to be exposed as a continuous public JSON/CSV stream in OSDR.` | `Use only as stress/fatigue context; not a standalone clinical diagnosis.` |

## **systolic_bp_mmhg**

| origin | evidence_source | continuous_telemetry | data_availability | unit | nominal_range | alert_threshold | subject_type | access_level | authentication | data_quality | derivation_formula | cdss_field | confidence | clinical_use | diagnostic_use | justification | caveats |
|---|---|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `SYNTHETIC_OR_ANALOG_DERIVED` | `OSD study or publication` | `false` | `NOT_AVAILABLE_AS_CONTINUOUS_PUBLIC_TIME_SERIES` | `mmHg` | `105–125 mmHg` | `Sustained hypertension, hypotension or deviation from individual baseline` | `ASTRONAUT_OR_ANALOG` | `UNKNOWN` | `UNKNOWN` | `ASSAY_METADATA_OR_PUBLICATION` | `` | `vitals.systolicBP` | `LOW` | `SUPPORTING_EVIDENCE_ONLY` | `false` | `Blood pressure may appear in cardiovascular, bed-rest, countermeasure or clinical studies, but not as a continuous public JSON/CSV telemetry series in OSDR.` | `Do not use as a direct SANS diagnostic marker without validated mission-specific evidence.` |

## **diastolic_bp_mmhg**

| origin | evidence_source | continuous_telemetry | data_availability | unit | nominal_range | alert_threshold | subject_type | access_level | authentication | data_quality | derivation_formula | cdss_field | confidence | clinical_use | diagnostic_use | justification | caveats |
|---|---|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `SYNTHETIC_OR_ANALOG_DERIVED` | `OSD study or publication` | `false` | `NOT_AVAILABLE_AS_CONTINUOUS_PUBLIC_TIME_SERIES` | `mmHg` | `60–80 mmHg` | `Sustained hypertension, hypotension or deviation from individual baseline` | `ASTRONAUT_OR_ANALOG` | `UNKNOWN` | `UNKNOWN` | `ASSAY_METADATA_OR_PUBLICATION` | `` | `vitals.diastolicBP` | `LOW` | `SUPPORTING_EVIDENCE_ONLY` | `false` | `Diastolic blood pressure may be reported in cardiovascular or analog studies, but it is unlikely to be available as continuous public telemetry in OSDR.` | `Use only as supporting cardiovascular context.` |

## **spo2_percent**

| origin | evidence_source | continuous_telemetry | data_availability | unit | nominal_range | alert_threshold | subject_type | access_level | authentication | data_quality | derivation_formula | cdss_field | confidence | clinical_use | diagnostic_use | justification | caveats |
|---|---|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `SYNTHETIC_OR_ANALOG_DERIVED` | `OSD study or publication` | `false` | `NOT_AVAILABLE_AS_CONTINUOUS_PUBLIC_TIME_SERIES` | `%` | `96–100%` | `Sustained desaturation relative to individual baseline` | `ASTRONAUT_OR_ANALOG` | `UNKNOWN` | `UNKNOWN` | `ASSAY_METADATA_OR_PUBLICATION` | `` | `vitals.spO2` | `LOW` | `SUPPORTING_EVIDENCE_ONLY` | `false` | `SpO2 may appear in hypoxia, EVA, exercise or analog studies, but it is unlikely to be exposed as continuous public JSON/CSV telemetry in OSDR.` | `Interpret together with cabin O2, pressure and CO2; not a standalone diagnosis.` |

## **body_temperature_c**

| origin | evidence_source | continuous_telemetry | data_availability | unit | nominal_range | alert_threshold | subject_type | access_level | authentication | data_quality | derivation_formula | cdss_field | confidence | clinical_use | diagnostic_use | justification | caveats |
|---|---|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `SYNTHETIC_OR_ANALOG_DERIVED` | `OSD study or publication` | `false` | `NOT_AVAILABLE_AS_CONTINUOUS_PUBLIC_TIME_SERIES` | `°C` | `36.1–37.2 °C` | `Sustained fever, hypothermia or heat-stress trend` | `ASTRONAUT_OR_ANALOG` | `UNKNOWN` | `UNKNOWN` | `ASSAY_METADATA_OR_PUBLICATION` | `` | `vitals.bodyTemperature` | `LOW` | `SUPPORTING_EVIDENCE_ONLY` | `false` | `Core or skin temperature may appear in thermoregulation, exercise, sleep or analog studies, but not as continuous public telemetry in OSDR.` | `Distinguish clearly between core and skin temperature.` |

## **blood_glucose_mg_dl**

| origin | evidence_source | continuous_telemetry | data_availability | unit | nominal_range | alert_threshold | subject_type | access_level | authentication | data_quality | derivation_formula | cdss_field | confidence | clinical_use | diagnostic_use | justification | caveats |
|---|---|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `SYNTHETIC_OR_ANALOG_DERIVED` | `OSD study or publication` | `false` | `NOT_AVAILABLE_AS_CONTINUOUS_PUBLIC_TIME_SERIES` | `mg/dL` | `75–105 mg/dL fasting` | `Hypoglycemia or sustained hyperglycemia relative to clinical reference and baseline` | `ASTRONAUT_OR_ANALOG` | `UNKNOWN` | `UNKNOWN` | `LAB_MEASUREMENT_OR_PUBLICATION` | `` | `vitals.bloodGlucose` | `LOW` | `SUPPORTING_EVIDENCE_ONLY` | `false` | `Blood glucose may appear as laboratory measurements in metabolic, nutrition, bed-rest or analog studies, but not as continuous public telemetry in OSDR.` | `Specify fasting versus postprandial measurement and collection time.` |

## **urinary_calcium_mg_day**

| origin | evidence_source | continuous_telemetry | data_availability | unit | nominal_range | alert_threshold | subject_type | access_level | authentication | data_quality | derivation_formula | cdss_field | confidence | clinical_use | diagnostic_use | justification | caveats |
|---|---|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `SYNTHETIC_OR_ANALOG_DERIVED` | `OSD study or publication` | `false` | `NOT_AVAILABLE_AS_CONTINUOUS_PUBLIC_TIME_SERIES` | `mg/day` | `Mission- and protocol-specific` | `Sustained elevation relative to baseline and protocol-specific reference` | `ASTRONAUT_OR_ANALOG` | `UNKNOWN` | `UNKNOWN` | `LAB_MEASUREMENT_OR_PUBLICATION` | `` | `biomarkers.urinaryCalcium` | `LOW` | `SUPPORTING_EVIDENCE_ONLY` | `false` | `Urinary calcium is typically a laboratory measurement related to bone resorption, immobilization, bed rest or spaceflight; it is unlikely to be available as continuous public telemetry in OSDR.` | `Use as bone-loss risk context, not as a direct osteoporosis diagnosis.` |

## Variables ambientales

## **cabin_co2_mmhg**

| origin | evidence_source | continuous_telemetry | data_availability | unit | nominal_range | alert_threshold | rest-source | subject_type | access_level | authentication | data_quality | derivation_formula | cdss_field | confidence | clinical_use | diagnostic_use | justification | caveats |
|---|---|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `DERIVED_FROM_REAL_NASA_OPEN_DATA` | `EDA cabin CO2 telemetry and cabin pressure` | `true` | `AVAILABLE_AS_DERIVED_TIME_SERIES` | `mmHg` | `< 2.0 mmHg` | `>= 3.0 mmHg 1-hour average` | `https://visualization.osdr.nasa.gov/eda/api/missions/RR-5/telemetry_data/` | `ISS_CABIN_OR_MODULE` | `OPEN` | `NONE` | `DERIVED` | `pCO2_mmHg = (co2_ppm / 1000000) * cabin_pressure_mmHg` | `environment.p_co2_mmHg` | `MEDIUM` | `ENVIRONMENTAL_MONITORING` | `false` | `EDA exposes ISS cabin and hardware environmental telemetry, including CO2. If partial pressure is not directly provided, derive it from CO2 ppm and total cabin pressure.` | `Validate pressure units and timestamp alignment before derivation.` |

## **radiation_dose_rate_usv_h**

| origin | evidence_source | continuous_telemetry | data_availability | unit | nominal_range | alert_threshold | rest-source | subject_type | access_level | authentication | data_quality | derivation_formula | cdss_field | confidence | clinical_use | diagnostic_use | justification | caveats |
|---|---|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `REAL_NASA_OPEN_DATA` | `NASA RadLab public API` | `true` | `AVAILABLE_AS_CONTINUOUS_PUBLIC_TIME_SERIES` | `µSv/hour` | `15–35 µSv/h` | `> 100 µSv/h` | `https://visualization.osdr.nasa.gov/radlab/api/?spacecraft=ISS&instrument=DosTel&timestamp>=2022-04-01T23:00&timestamp<2022-04-02T01:05&absorbed_dose_rate>=2&flux&latitude&longitude&altitude&B&L&format=json` | `SPACECRAFT_OR_MODULE` | `OPEN` | `NONE` | `RAW` | `` | `environment.radiationDoseRate` | `HIGH` | `RADIATION_MONITORING` | `false` | `RadLab provides programmatically retrievable radiation telemetry, including dose equivalent rate in µSv/hour, absorbed dose rate in µGy/hour and particle flux.` | `Use `dose_equivalent_rate` for µSv/h; do not confuse it with `absorbed_dose_rate`, which is in µGy/h.` |

## **radiation_accumulated_dose_msv**

| origin | evidence_source | continuous_telemetry | data_availability | unit | nominal_range | alert_threshold | rest-source | subject_type | access_level | authentication | data_quality | derivation_formula | cdss_field | confidence | clinical_use | diagnostic_use | justification | caveats |
|---|---|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `DERIVED_FROM_REAL_NASA_OPEN_DATA` | `NASA RadLab public API` | `true` | `AVAILABLE_AS_DERIVED_TIME_SERIES` | `mSv` | `Mission- and shielding-dependent` | `250 mSv per SPE event; 600 mSv career effective-dose limit` | `https://visualization.osdr.nasa.gov/radlab/api/?spacecraft=ISS&instrument=DosTel&timestamp>=2022-04-01T23:00&timestamp<2022-04-02T01:05&absorbed_dose_rate>=2&flux&latitude&longitude&altitude&B&L&format=json` | `SPACECRAFT_OR_MODULE` | `OPEN` | `NONE` | `DERIVED` | `cumulative_dose = integral(dose_rate, t_start, t_end)` | `environment.radiationAccumulatedDose` | `MEDIUM` | `RADIATION_EXPOSURE_MONITORING` | `false` | `Accumulated dose can be derived by integrating a validated dose-rate time series over time. Do not confuse instantaneous rate with cumulative dose.` | `Module-level dose is not individual astronaut dose; shielding, position and dosimeter type matter.` |

## **cabin_pressure_kpa**

| origin | evidence_source | continuous_telemetry | data_availability | unit | nominal_range | alert_threshold | subject_type | access_level | authentication | data_quality | derivation_formula | cdss_field | confidence | clinical_use | diagnostic_use | justification | caveats |
|---|---|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `SYNTHETIC_OR_ANALOG_DERIVED` | `ECLSS simulator or engineering publication` | `false` | `NOT_AVAILABLE_AS_CONTINUOUS_PUBLIC_TIME_SERIES` | `kPa` | `Mission-specific` | `Out-of-range pressure relative to ECLSS operating limits` | `ISS_CABIN_OR_MODULE` | `UNKNOWN` | `UNKNOWN` | `ASSAY_METADATA_OR_PUBLICATION` | `` | `environment.cabinPressure` | `LOW` | `SUPPORTING_EVIDENCE_ONLY` | `false` | `Cabin pressure telemetry from ECLSS is not available as a public continuous stream in OSDR/EDA; it must be generated by an ECLSS simulator or synthetic model.` | `Do not present synthetic values as NASA-measured cabin telemetry.` |

## **oxygen_partial_pressure_mmhg**

| origin | evidence_source | continuous_telemetry | data_availability | unit | nominal_range | alert_threshold | rest-source | subject_type | access_level | authentication | data_quality | derivation_formula | cdss_field | confidence | clinical_use | diagnostic_use | justification | caveats |
|---|---|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `DERIVED_FROM_REAL_NASA_OPEN_DATA_OR_SYNTHETIC` | `EDA cabin gas composition and pressure, if available` | `true` | `TO_BE_CONFIRMED` | `mmHg` | `Mission-specific` | `Hypoxia or hyperoxia relative to ECLSS operating limits` | `https://visualization.osdr.nasa.gov/eda/api/missions/RR-5/telemetry_data/` | `ISS_CABIN_OR_MODULE` | `OPEN` | `NONE` | `DERIVED_OR_SYNTHETIC` | `pO2_mmHg = O2_fraction * cabin_pressure_mmHg` | `environment.oxygenPartialPressure` | `MEDIUM` | `ENVIRONMENTAL_MONITORING` | `false` | `If O2 concentration and total pressure are available, partial pressure can be derived. If not, use a calibrated ECLSS simulator and label the value as synthetic.` | `Use consistent units for O2 fraction and total pressure.` |

## **ambient_temp_c**

| origin | evidence_source | continuous_telemetry | data_availability | unit | nominal_range | alert_threshold | rest-source | subject_type | access_level | authentication | data_quality | derivation_formula | cdss_field | confidence | clinical_use | diagnostic_use | justification | caveats |
|---|---|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `REAL_NASA_OPEN_DATA` | `NASA EDA cabin and hardware environmental telemetry` | `true` | `AVAILABLE_AS_CONTINUOUS_PUBLIC_TIME_SERIES` | `°C` | `Mission-specific` | `Combined high temperature and high humidity; ECLSS-specific threshold` | `https://visualization.osdr.nasa.gov/eda/api/missions/RR-5/telemetry_data/` | `ISS_CABIN_OR_MODULE` | `OPEN` | `NONE` | `RAW_AND_SUMMARY` | `` | `environment.ambientTemp` | `HIGH` | `ENVIRONMENTAL_MONITORING` | `false` | `EDA explicitly provides ISS cabin and hardware environmental telemetry, including temperature.` | `Distinguish cabin air temperature from hardware temperature.` |

## **ambient_humidity_pct**

| origin | evidence_source | continuous_telemetry | data_availability | unit | nominal_range | alert_threshold | rest-source | subject_type | access_level | authentication | data_quality | derivation_formula | cdss_field | confidence | clinical_use | diagnostic_use | justification | caveats |
|---|---|---:|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `REAL_NASA_OPEN_DATA` | `NASA EDA cabin and hardware environmental telemetry` | `true` | `AVAILABLE_AS_CONTINUOUS_PUBLIC_TIME_SERIES` | `%` | `Mission-specific` | `Combined high humidity and high temperature; ECLSS-specific threshold` | `https://visualization.osdr.nasa.gov/eda/api/missions/RR-5/telemetry_data/` | `ISS_CABIN_OR_MODULE` | `OPEN` | `NONE` | `RAW_AND_SUMMARY` | `` | `environment.ambientHumidity` | `HIGH` | `ENVIRONMENTAL_MONITORING` | `false` | `EDA explicitly provides ISS cabin and hardware environmental telemetry, including relative humidity.` | `Confirm whether the field is relative humidity or absolute humidity.` |
