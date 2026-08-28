/** @vitest-environment jsdom */
import { File } from "node:buffer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { importGalleryImage } from "../../src/systems/gallery/index.js";
import { beginGalleryImportProgress } from
  "../../src/ui/import/GalleryImportProgressPresenter.ts";

function mount() {
  globalThis.document.body.innerHTML = `<div id="gallery"></div>
    <div id="toast"></div><div id="gal-import-progress">
      <span id="gal-import-progress-name"></span>
      <span id="gal-import-progress-stage"></span>
      <span id="gal-import-progress-percent"></span>
      <div id="gal-import-progress-meter"></div></div>`;
}

describe("gallery import progress", () => {
  beforeEach(() => { mount(); vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it("does not flash for an import completed within two seconds", () => {
    const progress = beginGalleryImportProgress("fast.png");
    progress.stage("decoding"); progress.finish(true);
    vi.advanceTimersByTime(5_000);
    expect(globalThis.document.getElementById("gal-import-progress")?.classList.contains("on")).toBe(false);
    expect(globalThis.document.getElementById("gal-import-progress")?.classList.contains("pending")).toBe(false);
    expect(globalThis.document.getElementById("gallery")?.getAttribute("aria-busy")).toBe("false");
  });

  it("shows current monotonic progress after two seconds until completion", () => {
    const progress = beginGalleryImportProgress("large.psd");
    expect(globalThis.document.getElementById("gal-import-progress")?.classList.contains("pending")).toBe(true);
    progress.stage("decoding"); vi.advanceTimersByTime(1_999);
    expect(globalThis.document.getElementById("gal-import-progress")?.classList.contains("on")).toBe(false);
    vi.advanceTimersByTime(1);
    expect(globalThis.document.getElementById("gal-import-progress")?.classList.contains("on")).toBe(true);
    expect(globalThis.document.getElementById("gal-import-progress-meter")?.getAttribute("aria-valuenow")).toBe("20");
    progress.stage("checking"); progress.stage("saving");
    expect(globalThis.document.getElementById("gal-import-progress-percent")?.textContent).toBe("60%");
    progress.finish(true);
    expect(globalThis.document.getElementById("gal-import-progress")?.classList.contains("on")).toBe(false);
  });

  it("does not let an older session close a newer one", () => {
    const first = beginGalleryImportProgress("first.psd", 0);
    vi.runOnlyPendingTimers();
    const second = beginGalleryImportProgress("second.psd", 0);
    vi.runOnlyPendingTimers(); first.finish(false);
    expect(globalThis.document.getElementById("gal-import-progress")?.classList.contains("on")).toBe(true);
    expect(globalThis.document.getElementById("gal-import-progress-name")?.textContent).toBe("second.psd");
    second.finish(false);
  });

  it("bounds the wait for the initial compositor commit", async () => {
    vi.stubGlobal("requestAnimationFrame", undefined);
    const progress = beginGalleryImportProgress("large.png");
    const ready = progress.ready();
    vi.advanceTimersByTime(50); await ready;
    progress.finish(false); vi.unstubAllGlobals();
  });
});

describe("awaitable gallery image import", () => {
  beforeEach(mount);
  afterEach(() => vi.restoreAllMocks());

  it("reports decode through opening and awaits document persistence", async () => {
    let release = () => undefined;
    const saved = new Promise((resolve) => { release = () => resolve(true); });
    const stages = [], onOpened = vi.fn();
    const file = new File(["png"], "large.png", { type: "image/png" });
    const ports = {
      decodeImage: vi.fn(async () => ({ naturalWidth: 2, naturalHeight: 1 })),
      imageData: vi.fn(() => ({ width: 2, height: 1, data: new Uint8ClampedArray(8) })),
      looksPixelArt: vi.fn(() => false), newWorkFromImage: vi.fn(() => saved),
      beginConvertedWork: vi.fn(), openConverter: vi.fn(), onOpened,
    };
    const result = importGalleryImage(file, "C:\\Art\\large.png",
      { stage: (stage) => { stages.push(stage); }, finish: vi.fn() }, ports);
    await vi.waitFor(() => expect(ports.newWorkFromImage).toHaveBeenCalled());
    expect(stages).toEqual(["decoding", "preparing", "saving"]);
    release(); await expect(result).resolves.toBe(true);
    expect(stages).toEqual(["decoding", "preparing", "saving", "opening"]);
    expect(ports.newWorkFromImage).toHaveBeenCalledWith(2, 1,
      expect.any(Uint8ClampedArray), "large", "png", "C:\\Art\\large.png");
    expect(onOpened).toHaveBeenCalledOnce();
  });
});
