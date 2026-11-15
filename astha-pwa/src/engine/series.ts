// Almacenamiento columnar en memoria para los detectores de deriva (issue #5, RNF-POW-03).
// Una fila por día registrado y una columna Float32Array por indicador, en un único buffer contiguo con disposición
// [indicador][fila]: cada columna es una vista (subarray) sin copias. 180 días × 10 indicadores × 4 B = 7,2 KB por
// tripulante (≈ 29 KB para las 720 mediciones de la tripulación). Los huecos se guardan como NaN.
// Precisión: Float32 basta para las estadísticas de deriva (error relativo ~1e-7, muy por debajo del 0,01 % exigido),
// pero NO se usa para clasificar umbrales: en Float32, 37,9 °C se guarda como 37,9000015 y cambiaría de banda.
// El clasificador recibe siempre el valor original en Float64.
import { CREW_INDICATORS, type CrewIndicator, type DailyMeasurement } from './types';

const FIELD_INDEX = new Map<CrewIndicator, number>(CREW_INDICATORS.map((id, i) => [id, i]));

export class SeriesMatrix {
  /** Día de misión de cada fila, ascendente. */
  readonly days: Int16Array;
  /** Buffer único [indicador][fila]. */
  readonly data: Float32Array;

  private constructor(readonly length: number) {
    this.days = new Int16Array(length);
    this.data = new Float32Array(length * CREW_INDICATORS.length);
  }

  /** Construye la matriz a partir del historial (ordenado por día, como lo entrega el Data Worker). */
  static from(history: readonly DailyMeasurement[]): SeriesMatrix {
    const m = new SeriesMatrix(history.length);
    const n = history.length;
    for (let row = 0; row < n; row++) {
      const rec = history[row];
      m.days[row] = rec.day;
      for (let f = 0; f < CREW_INDICATORS.length; f++) {
        const v = rec[CREW_INDICATORS[f]];
        m.data[f * n + row] = typeof v === 'number' && Number.isFinite(v) ? v : Number.NaN;
      }
    }
    return m;
  }

  /** Columna de un indicador: vista sin copia sobre el buffer. */
  column(id: CrewIndicator): Float32Array {
    const f = FIELD_INDEX.get(id);
    if (f === undefined) throw new Error(`indicador sin columna: ${id}`);
    return this.data.subarray(f * this.length, (f + 1) * this.length);
  }

  get lastDay(): number {
    return this.length ? this.days[this.length - 1] : 0;
  }

  get byteLength(): number {
    return this.days.byteLength + this.data.byteLength;
  }
}
