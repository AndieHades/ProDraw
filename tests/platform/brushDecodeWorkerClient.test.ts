import { describe, expect, it, vi } from "vitest";
import type { BrushPreset, LoadedBrush } from "../../src/contracts/brush";
import type { BrushDecoderPort } from "../../src/contracts/brushDecoder";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import {
  coverageTransferables, type BrushDecodeRequest, type BrushDecodeResponse
} from "../../src/platform/brush/brushDecodeProtocol";
import {
  WorkerBrushDecoder, type BrushDecodeWorkerPort
} from "../../src/platform/brush/WorkerBrushDecoder";

class FakeWorker implements BrushDecodeWorkerPort {
  onmessage: ((event: { readonly data: unknown }) => void) | null = null;
  onerror: ((event: { readonly message?: string }) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  readonly requests: BrushDecodeRequest[] = [];
  readonly transfers: ArrayBuffer[][] = [];
  terminated = false;

  postMessage(message: BrushDecodeRequest, transfer: ArrayBuffer[]): void {
    this.requests.push(message);
    this.transfers.push(transfer);
  }

  terminate(): void { this.terminated = true; }

  reply(response: BrushDecodeResponse): void { this.onmessage?.({ data: response }); }
}

function fixturePreset(index = 0): BrushPreset {
  const preset = BUNDLED_BRUSHES[index];
  if (!preset) throw new Error("Bundled brush fixture is unavailable");
  return preset;
}

function loaded(preset: BrushPreset, marker: number): LoadedBrush {
  const map = { width: 1, height: 1, data: Uint8Array.of(marker) };
  return { ...preset, shapeMap: map, grainMap: null,
    nativeShapeMap: map, nativeGrainMap: null,
    compatibility: { archiveVersion: 4, archiveName: preset.name,
      supportedFields: [], unsupportedActiveFields: [],
      excludedSections: ["wet-mix", "color-dynamics", "materials"] }, warnings: [] };
}

describe("WorkerBrushDecoder", () => {
  it("transfers binary requests and correlates out-of-order responses", async () => {
    const worker = new FakeWorker();
    const fallback: BrushDecoderPort = { decode: vi.fn() };
    const decoder = new WorkerBrushDecoder(worker, fallback);
    const firstPreset = fixturePreset(0);
    const secondPreset = fixturePreset(1);
    const first = decoder.decode(Uint8Array.of(11, 12), firstPreset);
    const second = decoder.decode(Uint8Array.of(21, 22), secondPreset);
    const firstRequest = worker.requests[0];
    const secondRequest = worker.requests[1];
    if (!firstRequest || !secondRequest) throw new Error("Decode request was not posted");

    expect(firstRequest.bytes).toBeInstanceOf(ArrayBuffer);
    expect(worker.transfers[0]).toEqual([firstRequest.bytes]);
    worker.reply({ type: "decoded", id: secondRequest.id,
      brush: loaded(secondPreset, 2) });
    worker.reply({ type: "decoded", id: firstRequest.id,
      brush: loaded(firstPreset, 1) });
    await expect(second).resolves.toMatchObject({ id: secondPreset.id });
    await expect(first).resolves.toMatchObject({ id: firstPreset.id });
    expect(fallback.decode).not.toHaveBeenCalled();
  });

  it("falls back for pending and future work after worker failure", async () => {
    const worker = new FakeWorker();
    const fallback: BrushDecoderPort = {
      decode: vi.fn(async (_bytes, preset) => loaded(preset, 9))
    };
    const decoder = new WorkerBrushDecoder(worker, fallback);
    const preset = fixturePreset();
    const pending = decoder.decode(Uint8Array.of(1), preset);
    worker.onerror?.({ message: "worker crashed" });
    await expect(pending).resolves.toMatchObject({ id: preset.id });
    await expect(decoder.decode(Uint8Array.of(2), preset)).resolves.toBeTruthy();
    expect(worker.terminated).toBe(true);
    expect(fallback.decode).toHaveBeenCalledTimes(2);
  });

  it("deduplicates aliased coverage buffers in the response transfer list", () => {
    const brush = loaded(fixturePreset(), 7);
    expect(coverageTransferables(brush)).toEqual([brush.shapeMap?.data.buffer]);
  });
});
