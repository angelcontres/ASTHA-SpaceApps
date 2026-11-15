// Clinical Engine — Dedicated Worker (ADR-005, C4 §3.1).
// Envuelve el pipeline puro. Sin red ni almacenamiento (RF-EVA-07): solo importa src/engine y tipos.
// Nada se ejecuta sin un mensaje: no hay temporizadores ni bucles.
import { evaluate } from '../engine/pipeline';
import type { Assessment } from '../engine/types';
import type { ClinicalResult, DataToClinical, UiToClinical } from './protocol';

interface WorkerScope {
  postMessage(msg: unknown): void;
  addEventListener(type: 'message', fn: (e: MessageEvent) => void): void;
}
const scope = globalThis as unknown as WorkerScope;

let dataPort: MessagePort | null = null;

function run(req: DataToClinical): ClinicalResult {
  const t0 = performance.now();
  const items: Assessment[] = [];
  for (const input of req.inputs) {
    try {
      items.push(evaluate(input));
    } catch (e) {
      // Un tripulante con datos imposibles nunca bloquea la evaluación del resto.
      console.error('[clinical] evaluación fallida', input.crewId, e);
    }
  }
  return { type: 'assessments', reqId: req.reqId, items, engineMs: performance.now() - t0 };
}

scope.addEventListener('message', (e: MessageEvent<UiToClinical>) => {
  const msg = e.data;
  if (msg.type === 'connect') {
    dataPort = e.ports[0] ?? null;
    if (!dataPort) return;
    dataPort.onmessage = (ev: MessageEvent<DataToClinical>) => {
      if (ev.data?.type !== 'evaluate') return;
      const result = run(ev.data);
      scope.postMessage(result); // Assessment → UI
      dataPort?.postMessage(result); // → Data Worker (bitácora de alertas, exportación)
    };
    scope.postMessage({ type: 'ready' });
  } else if (msg.type === 'evaluate') {
    // Evaluación directa desde la UI (mensaje tipado), sin pasar por el Data Worker.
    scope.postMessage(run(msg));
  }
});
