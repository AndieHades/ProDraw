import type { BrushPreset, LoadedBrush } from "../../contracts/brush";
import type { BrushDecoderPort } from "../../contracts/brushDecoder";
import {
  isBrushDecodeResponse, type BrushDecodeRequest
} from "./brushDecodeProtocol";

export interface BrushDecodeWorkerPort {
  onmessage: ((event: { readonly data: unknown }) => void) | null;
  onerror: ((event: { readonly message?: string }) => void) | null;
  onmessageerror: (() => void) | null;
  postMessage(message: BrushDecodeRequest, transfer: ArrayBuffer[]): void;
  terminate(): void;
}

interface PendingDecode {
  readonly bytes: Uint8Array<ArrayBuffer>;
  readonly preset: BrushPreset;
  readonly resolve: (brush: LoadedBrush) => void;
  readonly reject: (error: unknown) => void;
}

export class WorkerBrushDecoder implements BrushDecoderPort {
  readonly #pending = new Map<number, PendingDecode>();
  readonly #fallback: BrushDecoderPort;
  #worker: BrushDecodeWorkerPort | null;
  #nextId = 1;

  constructor(worker: BrushDecodeWorkerPort, fallback: BrushDecoderPort) {
    this.#worker = worker;
    this.#fallback = fallback;
    worker.onmessage = (event) => this.receive(event.data);
    worker.onerror = (event) => this.failWorker(event.message ?? "Brush worker failed");
    worker.onmessageerror = () => this.failWorker("Brush worker message failed");
  }

  decode(bytes: Uint8Array<ArrayBuffer>, preset: BrushPreset): Promise<LoadedBrush> {
    const worker = this.#worker;
    if (!worker) return this.#fallback.decode(bytes, preset);
    const id = this.#nextId;
    this.#nextId += 1;
    return new Promise<LoadedBrush>((resolve, reject) => {
      this.#pending.set(id, { bytes, preset, resolve, reject });
      const transferredBytes = bytes.slice().buffer;
      try {
        worker.postMessage({ type: "decode", id, bytes: transferredBytes, preset },
          [transferredBytes]);
      } catch (error) {
        this.failWorker(error);
      }
    });
  }

  terminate(): void { this.failWorker("Brush worker terminated"); }

  private receive(value: unknown): void {
    if (!isBrushDecodeResponse(value)) return;
    const pending = this.#pending.get(value.id);
    if (!pending) return;
    this.#pending.delete(value.id);
    if (value.type === "decoded") pending.resolve(value.brush);
    else this.runFallback(pending);
  }

  private failWorker(reason: unknown): void {
    const worker = this.#worker;
    if (!worker) return;
    this.#worker = null;
    worker.terminate();
    const pending = [...this.#pending.values()];
    this.#pending.clear();
    for (const request of pending) this.runFallback(request, reason);
  }

  private runFallback(request: PendingDecode, _reason?: unknown): void {
    void this.#fallback.decode(request.bytes, request.preset)
      .then(request.resolve, request.reject);
  }
}
