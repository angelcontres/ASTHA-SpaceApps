# Estructura y Alcance de Datos para el Sistema CDSS

## Nota Preliminar
Las fuentes constituyen una referencia con la que se trabajó, extrayéndolas desde repositorios/APIs de libre acceso, pero no son datos utiizados para poder mostrar el comportamiento interactivo del software.

Documento de referencia técnica sobre la disponibilidad, cobertura, fuentes de datos y limitaciones analizadas para el pipeline de ingesta y monitoreo del CDSS (Clinical Decision Support System).

---

## 1. Resumen Ejecutivo del Alcance

El análisis de viabilidad de fuentes públicas de la NASA determina una arquitectura híbrida para el sistema:

1. **Datos Ambientales y Físicos (Disponibles / Parciales):** Telemetría de radiación ambiental de RadLab y condiciones de cabina de EDA (Environmental Data Application).
2. **Brechas Fisiológicas Críticas (Sintéticos / Simulados requeridos):** Ausencia de telemetría biométrica continua de acceso abierto (p. ej. frecuencia cardíaca minuto a minuto, SpO2 continua, HRV) y de telemetría de hardware operativo de soporte vital (ECLSS).
3. **Estrategia Edge Offline:** Descarga y almacenamiento en caché local de datos crudos (CSV/JSON) para mitigar la dependencia de APIs inferidas o no documentadas.

---

## 2. Catálogo de APIs y Fuentes Evaluadas

| Fuente | Endpoint / Acceso | Método | Autenticación | Nivel de Acceso | Tipo de Dato | Relevancia |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **RADLAB** | `https://visualization.osdr.nasa.gov/radlab/api` | `GET` | Ninguna | `OPEN` | `RAW` | **ALTA** |
| **OSDR_BIO_API** | `https://visualization.osdr.nasa.gov/biodata/api/v2/` | `GET` | Ninguna | `OPEN` | `SUMMARY` | **MEDIA** |
| **EDA** | `https://visualization.osdr.nasa.gov/eda/` (GUI) / `.../eda/api` (Inferred) | `GET` | Desconocida | `UNKNOWN` (GUI Pública) | `RAW` | **ALTA** |

---

## 3. Especificación Detallada de Fuentes

### 3.1 RADLAB (Radiation Laboratory Data)
- **Endpoint:** `https://visualization.osdr.nasa.gov/radlab/api`
- **Formatos de respuesta:** JSON, CSV, TSV
- **Variables disponibles:** `absorbed_dose_rate`, `dose_equivalent_rate`, `flux`, `timestamp`, `instrument_id`, `module`
- **Unidades:**
  - `absorbed_dose_rate`: $\mu\text{Gy/hour}$
  - `dose_equivalent_rate`: $\mu\text{Gy/hour}$
  - `flux`: $\text{cm}^2\cdot\text{sr}^{-1}\cdot\text{s}^{-1}$
- **Parámetros de consulta:**
  - `spacecraft`: ISS (o vacío para todas)
  - `module`: Ej. `'US Lab'`, `'Cupola'`, `'JPM'`
  - `instrument_id`: Ej. `'REM-Lid'`, `'Liulin-5-D2'`
  - `timestamp`: Formato ISO-8601 (`YYYY-MM-DDTHH:MM`) o Unix timestamp
  - Filtros numéricos: `absorbed_dose_rate`, `dose_equivalent_rate`, `flux`
- **Cobertura y resolución:**
  - *Misiones:* ISS, BioSentinel, Chang'e 4, LRO, ExoMars, Curiosity (BLEO e ISS).
  - *Resolución temporal:* Minutos a horas (variable según instrumento).
- **Limitaciones:** La tasa está expresada en $\mu\text{Gy/h}$. No provee la dosis acumulada por astronauta ni la tasa convertida a $\mu\text{Sv/h}$.
- **Transformación recomendada:** Aplicar factor de calidad de radiación ($Q$) para convertir $\mu\text{Gy/h} \to \mu\text{Sv/h}$. Integrar numéricamente la tasa en el tiempo para computar la dosis acumulada.

---

### 3.2 OSDR_BIO_API (Open Science Data Repository Bio API v2)
- **Endpoint:** `https://visualization.osdr.nasa.gov/biodata/api/v2/`
- **Formatos de respuesta:** JSON (por defecto), CSV, TSV, browser
- **Variables disponibles:** Metadatos ISA-Tab (*investigation, study, assay, sample*), anotaciones de organismo, factores de vuelo espacial, datos ómicos (conteos, etc.).
- **Parámetros de consulta:**
  - `format`: `json`, `csv`, `tsv`, `browser`
  - `id.accession`: Ej. `OSD-48`
  - `study.factor value.spaceflight`: Filtro de vuelo espacial
  - `study.characteristics.organism`: Ej. `Homo sapiens`
  - `file.data type`: Ej. `raw multiqc report`, `unnormalized counts`
- **Cobertura:** Múltiples décadas (ISS, análogos, *Bed rest*, HERA, Artemis futuro). Resolución temporal no continua (datos discretos por estudio/muestra).
- **Limitaciones:** Proporciona metadatos y datos ómicos de estudios, pero carece de series temporales fisiológicas continuas para uso directo en tiempo real por el CDSS.
- **Transformación recomendada:** Emplear para consulta de metadatos e identificación de estudios biomédicos de referencia; la extracción de datos crudos requiere procesamiento fuera del alcance de la API v2.

---

### 3.3 EDA (Environmental Data Application)
- **Acceso:** GUI interactiva (`/eda/`) con descarga manual de tablas de datos. Endpoint API inferido (`.../eda/api`) no documentado.
- **Formatos de respuesta:** CSV (descarga confirmada desde *Data Tables*), JSON (inferido).
- **Variables disponibles:** `co2_ppm`, `ambient_temp_c`, `ambient_humidity_pct`, `cabin_pressure`, `pO2`
- **Unidades:**
  - `co2_ppm`: $\text{ppm}$
  - `ambient_temp_c`: $^\circ\text{C}$
  - `ambient_humidity_pct`: $\%$
  - `cabin_pressure`: $\text{kPa}$ / $\text{mmHg}$ (según instrumento)
- **Cobertura y resolución:** Misiones de larga duración en la ISS. Resolución temporal a nivel de minutos.
- **Limitaciones:** Endpoint de API no documentado oficialmente. Depender de endpoints inferidos introduce riesgo operativo para un pipeline Edge.
- **Transformación recomendada:** Descargar los archivos CSV de variables críticas desde *Data Tables* y almacenarlos localmente en el pipeline offline. Validar exhaustivamente la estabilidad de cualquier API inferida antes de producción.

---

## 4. Matriz de Cobertura de Variables

| Variable | Disponible en Datos Abiertos | Fuente Principal | Endpoint / Mecanismo | Unidad | Nivel de Acceso |
| :--- | :---: | :--- | :--- | :---: | :--- |
| `co2_ppm` | **SÍ** | EDA | GUI `/eda/` (CSV) / API inferida | $\text{ppm}$ | `UNKNOWN` (GUI pública) |
| `p_co2_mmHg` | **NO** | Derivable de EDA | N/A (Cálculo indirecto) | $\text{mmHg}$ | `UNKNOWN` |
| `ambient_temp_c` | **SÍ** | EDA | GUI `/eda/` (CSV) / API inferida | $^\circ\text{C}$ | `UNKNOWN` (GUI pública) |
| `ambient_humidity_pct` | **SÍ** | EDA | GUI `/eda/` (CSV) / API inferida | $\%$ | `UNKNOWN` (GUI pública) |
| `radiation_usv_h` | **SÍ** | RadLab | `/radlab/api` | $\mu\text{Gy/h} \to \mu\text{Sv/h}$ | `NONE` (Abierto) |
| `radiation_accumulated_dose_mSv` | **NO** | Derivable de RadLab | N/A (Integración temporal) | $\text{mSv}$ | `NONE` (Para tasa) |
| `heart_rate_bpm` | **NO** | Ninguna confirmada | N/A (Restringido / Ausente) | $\text{bpm}$ | `RESTRICTED / UNKNOWN` |

---

## 5. Análisis de Brechas (Gap Analysis) y Mitigaciones

### 5.1 Presión Parcial de Dióxido de Carbono (`p_co2_mmHg`)
- **Estado:** No disponible directamente como variable abierta.
- **Alternativa identificada:** `co2_ppm` + `cabin_pressure` desde EDA.
- **Recomendación de cálculo:**
  $$\text{pCO}_2 = \left(\frac{\text{co2\_ppm}}{10^6}\right) \times \text{cabin\_pressure}$$
  *(Asegurando consistencia de unidades a $\text{mmHg}$). Si no se cuenta con ambas mediciones sincronizadas, mantener como variable sintética/simulada.*

### 5.2 Dosis Acumulada de Radiación (`radiation_accumulated_dose_mSv`)
- **Estado:** La API de RadLab provee tasas instantáneas (`absorbed_dose_rate` / `dose_equivalent_rate`), no el acumulado individual de misión.
- **Alternativa identificada:** Integración temporal de la tasa de dosis.
- **Recomendación técnica:** Implementar un acumulador en el pipeline Edge que integre la tasa a lo largo del tiempo:
  $$\text{Dosis Acumulada} = \int \text{dose\_rate}(t)\,dt$$
  *Si no existe serie temporal continua, catalogar la variable como sintética.*

### 5.3 Biometría Continua (`heart_rate_bpm`, `hrv_ms`, SpO2, etc.)
- **Estado:** No existen series temporales continuas públicas disponibles en OSDR, EDA o RadLab (datos protegidos por privacidad médica).
- **Alternativa identificada:** Puntos temporales aislados en estudios de OSDR Bio API.
- **Recomendación técnica:** Modelar la biometría continua de astronautas mediante **datos sintéticos o simulados** en el CDSS, o habilitar un canal de solicitud formal (`REQUEST_REQUIRED`) para entornos clínicos certificados.

### 5.4 Estado Operativo de Soporte Vital ECLSS (Scrubbers, CDRA, etc.)
- **Estado:** No existe telemetría pública de hardware operativo en EDA.
- **Alternativa identificada:** Ninguna fuente pública directa.
- **Recomendación técnica:** Mantener el estado de subsistemas ECLSS como simulado/sintético o derivar alertas indirectas basadas en desviaciones ambientales de $\text{CO}_2$ o presión parcial de $\text{O}_2$.
