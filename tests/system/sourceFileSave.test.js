import { Blob } from "node:buffer";
import { describe, expect, it, vi } from "vitest";
import { createPngSaver, createPsdSaver } from "../../src/systems/psd-save.js";

describe("source-bound Save", () => {
  it("writes encoded PNG bytes to the remembered path", async () => {
    const bytes = Uint8Array.from([137, 80, 78, 71]);
    const write = vi.fn(async () => true);
    const save = createPngSaver(async () => ({ blob: new Blob([bytes]) }), write,
      { sourceFormat: "png", sourceLocation: "C:\\Art\\sprite.png" });

    await expect(save()).resolves.toBe(true);
    expect(write).toHaveBeenCalledWith("C:\\Art\\sprite.png", bytes);
  });

  it("keeps layered PSD saving on its remembered path", async () => {
    const bytes = Uint8Array.from([56, 66, 80, 83]);
    const write = vi.fn(async () => true);
    const save = createPsdSaver(async () => ({ blob: new Blob([bytes]) }), write,
      { sourceFormat: "psd", sourceLocation: "C:\\Art\\layers.psd" });

    await expect(save()).resolves.toBe(true);
    expect(write).toHaveBeenCalledWith("C:\\Art\\layers.psd", bytes);
  });

  it("does not write when the source path does not match the format", async () => {
    const write = vi.fn(async () => true);
    const save = createPngSaver(async () => ({ blob: new Blob() }), write,
      { sourceFormat: "png", sourceLocation: "C:\\Art\\sprite.jpg" });
    await expect(save()).resolves.toBe(false); expect(write).not.toHaveBeenCalled();
  });
});
