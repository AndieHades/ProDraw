import type { BrushDecoderPort } from "../../contracts/brushDecoder";
import { WorkerBrushDecoder, type BrushDecodeWorkerPort } from "./WorkerBrushDecoder";

export type BrushDecodeWorkerFactory = () => BrushDecodeWorkerPort;

function browserWorker(): BrushDecodeWorkerPort {
  return new Worker(new URL("./brushDecode.worker.ts", import.meta.url), {
    type: "module", name: "prodraw-brush-decoder"
  }) as BrushDecodeWorkerPort;
}

export function createBrushDecoder(
  fallback: BrushDecoderPort,
  factory: BrushDecodeWorkerFactory = browserWorker
): BrushDecoderPort {
  if (typeof Worker === "undefined") return fallback;
  try { return new WorkerBrushDecoder(factory(), fallback); }
  catch { return fallback; }
}
