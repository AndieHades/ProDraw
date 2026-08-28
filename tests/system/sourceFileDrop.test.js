/** @vitest-environment jsdom */
import { File } from "node:buffer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as actions from "../../src/core/actions.ts";
import { newLayer, S } from "../../src/core/state.js";
import { dropImage, insertPngFileAsLayer } from "../../src/systems/import/index.js";
import { requestPngDropDestination } from
  "../../src/ui/import/PngDropDestinationPresenter.ts";

const png = () => new File([Uint8Array.from([137, 80, 78, 71])], "overlay.png",
  { type: "image/png" });

function mount(open = false) {
  globalThis.document.body.innerHTML = `<div id="gallery" class="${open ? "on" : ""}"></div>
    <div id="toast"></div><div id="png-drop-ovl" class="ovl">
      <button id="png-drop-cancel"></button><button id="png-drop-layer"></button>
      <button id="png-drop-document"></button></div>`;
}

describe("source file drop routing", () => {
  beforeEach(() => mount());
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("opens PNG dropped on the gallery as a source-bound document", async () => {
    mount(true); const file = png(), choose = vi.fn(), routed = [];
    const progress = { stage: vi.fn(), finish: vi.fn() };
    actions.registerOrReplace("gallery.importDrop", async (...args) => routed.push(args));
    await dropImage(file, () => "C:\\Art\\overlay.png",
      { choosePngDestination: choose, beginGalleryProgress: () => progress });
    expect(routed).toEqual([[file, "C:\\Art\\overlay.png", progress]]);
    expect(choose).not.toHaveBeenCalled();
    expect(progress.finish).toHaveBeenCalledWith(true);
  });

  it("offers the same source-bound document route over an open canvas", async () => {
    const file = png(), routed = [];
    actions.registerOrReplace("gallery.importDrop", async (...args) => routed.push(args));
    const result = await dropImage(file, () => "C:\\Art\\overlay.png",
      { choosePngDestination: async () => "document" });
    expect(result).toBe("document");
    expect(routed).toEqual([[file, "C:\\Art\\overlay.png"]]);
  });

  it("adds PNG as a layer without replacing the current source binding", async () => {
    const file = png(), insert = vi.fn(async () => true), routed = vi.fn();
    S.sourceFormat = "png"; S.sourceLocation = "C:\\Art\\base.png";
    actions.registerOrReplace("gallery.importDrop", routed);
    const result = await dropImage(file, () => "C:\\Art\\overlay.png", {
      choosePngDestination: async () => "layer", insertPngLayer: insert,
    });
    expect(result).toBe("layer"); expect(insert).toHaveBeenCalledWith(file);
    expect(routed).not.toHaveBeenCalled();
    expect([S.sourceFormat, S.sourceLocation]).toEqual(["png", "C:\\Art\\base.png"]);
  });

  it("does nothing after cancelling the destination choice", async () => {
    const insert = vi.fn(), routed = vi.fn();
    actions.registerOrReplace("gallery.importDrop", routed);
    await expect(dropImage(png(), () => "C:\\Art\\overlay.png", {
      choosePngDestination: async () => null, insertPngLayer: insert,
    })).resolves.toBeNull();
    expect(insert).not.toHaveBeenCalled(); expect(routed).not.toHaveBeenCalled();
  });

  it("keeps PSD drops on the separate-document route without a choice", async () => {
    const file = new File(["8BPS"], "layers.psd",
      { type: "image/vnd.adobe.photoshop" });
    const routed = vi.fn(async () => true), choose = vi.fn();
    actions.registerOrReplace("import.psdFile", routed);
    await dropImage(file, () => "C:\\Art\\layers.psd",
      { choosePngDestination: choose });
    expect(routed).toHaveBeenCalledWith(file, "C:\\Art\\layers.psd");
    expect(choose).not.toHaveBeenCalled();
  });

  it("keeps gallery PSD progress open through the routed command", async () => {
    mount(true); const file = new File(["8BPS"], "large.psd",
      { type: "image/vnd.adobe.photoshop" });
    const progress = { stage: vi.fn(), finish: vi.fn() };
    const routed = vi.fn(async () => true);
    actions.registerOrReplace("import.psdFile", routed);
    await dropImage(file, () => "C:\\Art\\large.psd",
      { beginGalleryProgress: () => progress });
    expect(routed).toHaveBeenCalledWith(file, "C:\\Art\\large.psd", progress);
    expect(progress.finish).toHaveBeenCalledWith(true);
  });

  it("resolves modal buttons and replaces an unresolved choice", async () => {
    const first = requestPngDropDestination();
    const second = requestPngDropDestination();
    await expect(first).resolves.toBeNull();
    globalThis.document.getElementById("png-drop-layer").click();
    await expect(second).resolves.toBe("layer");
    const third = requestPngDropDestination();
    globalThis.document.getElementById("png-drop-document").click();
    await expect(third).resolves.toBe("document");
    const cancelled = requestPngDropDestination();
    globalThis.document.getElementById("png-drop-cancel").click();
    await expect(cancelled).resolves.toBeNull();
    expect(globalThis.document.getElementById("png-drop-ovl").classList.contains("on")).toBe(false);
  });

  it("decodes a PNG into a named top layer with undo and fixed canvas size", async () => {
    const rgba = new Uint8ClampedArray([1, 2, 3, 255, 4, 5, 6, 255]);
    vi.spyOn(globalThis.HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      imageSmoothingEnabled: false, drawImage: vi.fn(),
      getImageData: () => ({ width: 2, height: 1, data: rgba }),
    });
    class FakeImage { naturalWidth = 2; naturalHeight = 1;
      set src(_value) { Promise.resolve().then(() => this.onload()); } }
    vi.stubGlobal("Image", FakeImage);
    vi.stubGlobal("URL", { createObjectURL: () => "blob:png", revokeObjectURL: vi.fn() });
    S.W = 4; S.H = 4; S.layers = [newLayer("Base", 4, 4)]; S.cur = 0;
    S.folders = []; S.marked = new Set(); S.undoStack = []; S.redoStack = [];
    S.sourceFormat = "png"; S.sourceLocation = "C:\\Art\\base.png";

    await expect(insertPngFileAsLayer(png())).resolves.toBe(true);

    expect([S.W, S.H]).toEqual([4, 4]); expect(S.layers).toHaveLength(2);
    expect(S.layers[1].name).toBe("overlay"); expect(S.undoStack).toHaveLength(1);
    expect(S.layers[1].grid[1][1]).toEqual([1, 2, 3, 255]);
    expect([S.sourceFormat, S.sourceLocation]).toEqual(["png", "C:\\Art\\base.png"]);
  });
});
