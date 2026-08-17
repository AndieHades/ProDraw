import { decodeProcreateBrush } from "../../core/brush/procreateBrush";
import {
  coverageTransferables, type BrushDecodeRequest, type BrushDecodeResponse
} from "./brushDecodeProtocol";

interface WorkerScope {
  onmessage: ((event: { readonly data: BrushDecodeRequest }) => void) | null;
  postMessage(message: BrushDecodeResponse, transfer: ArrayBuffer[]): void;
}

const scope = globalThis as unknown as WorkerScope;

scope.onmessage = (event): void => {
  const request = event.data;
  if (request.type !== "decode") return;
  void decodeProcreateBrush(new Uint8Array(request.bytes), request.preset)
    .then((brush) => {
      scope.postMessage({ type: "decoded", id: request.id, brush },
        coverageTransferables(brush));
    }, (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      scope.postMessage({ type: "failed", id: request.id, message }, []);
    });
};
