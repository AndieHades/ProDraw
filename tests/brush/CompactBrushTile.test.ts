/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BrushPreset, LoadedBrush } from "../../src/contracts/brush";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import type { CompactBrushShellPort } from
  "../../src/ui/brushes/CompactBrushShellPort";
import {
  compactBrushTile, disposeCompactBrushTile
} from "../../src/ui/brushes/CompactBrushTile";
import { BrushPreviewQueue } from "../../src/ui/brushes/BrushPreviewQueue";
import { BrushPreviewCache } from "../../src/core/brush/BrushPreviewCache";

describe("compact original brush tile", () => {
  beforeEach(() => {
    vi.stubGlobal("ImageData", class TestImageData {
      constructor(readonly data: Uint8ClampedArray, readonly width: number,
        readonly height: number) {}
    });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      putImageData: vi.fn()
    } as unknown as CanvasRenderingContext2D);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals();
    document.body.replaceChildren(); });

  it("keeps an empty source slot, double-click edit and RMB menu", () => {
    const brush = BUNDLED_BRUSHES[0]!;
    const choose = vi.fn(), edit = vi.fn(), menu = vi.fn();
    let reorder: (() => void) | null = null;
    const shell = shellPort((save) => { reorder = save; });
    const previews = new BrushPreviewQueue(); previews.pause();
    const tile = compactBrushTile(brush, brush.id, { choose, edit, menu,
      reorder: vi.fn(), load: pendingLoad, shell, previews });
    document.body.append(tile);

    expect(tile.classList.contains("on")).toBe(true);
    expect(tile.querySelector("canvas.btile-ic")).not.toBeNull();
    expect(tile.querySelector(".bname")?.textContent).toBe(brush.name);
    tile.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, button: 0 }));
    expect(edit).toHaveBeenCalledWith(brush);
    tile.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 2,
      clientX: 20, clientY: 30 }));
    tile.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, button: 2,
      clientX: 20, clientY: 30 }));
    expect(choose).toHaveBeenCalledWith(brush);
    expect(menu).toHaveBeenCalledWith(brush, expect.any(MouseEvent));
    expect(reorder).not.toBeNull();
  });

  it("marks a missing Shape source without inventing a circular tip", async () => {
    const brush = BUNDLED_BRUSHES[0]!;
    const previews = new BrushPreviewQueue();
    const tile = compactBrushTile(brush, null, { choose: vi.fn(), edit: vi.fn(),
      menu: vi.fn(), reorder: vi.fn(), load: async () => loadedWithoutSources(brush),
      shell: shellPort(() => undefined), previews });
    document.body.append(tile);
    await previews.whenIdle();
    expect(tile.querySelector<HTMLCanvasElement>("canvas")?.classList
      .contains("missing-source")).toBe(true);
  });

  it("schedules a connected tile even when IntersectionObserver is late", async () => {
    let reveal = (): void => undefined;
    class TestObserver {
      constructor(callback: IntersectionObserverCallback) {
        reveal = () => callback([{ isIntersecting: true }] as IntersectionObserverEntry[],
          this as unknown as IntersectionObserver);
      }
      observe(): void { /* controlled by reveal */ }
      disconnect(): void { /* test observer */ }
    }
    vi.stubGlobal("IntersectionObserver", TestObserver);
    const brush = BUNDLED_BRUSHES[0]!;
    const load = vi.fn(async () => loadedWithoutSources(brush));
    const previews = new BrushPreviewQueue();
    const tile = compactBrushTile(brush, null, { choose: vi.fn(), edit: vi.fn(),
      menu: vi.fn(), reorder: vi.fn(), load, shell: shellPort(() => undefined), previews });
    document.body.append(tile);
    await Promise.resolve();
    await previews.whenIdle();
    expect(load).toHaveBeenCalledOnce();
    reveal();
    expect(load).toHaveBeenCalledOnce();
  });

  it("cancels pending preview work when its tile is destroyed", async () => {
    const brush = BUNDLED_BRUSHES[0]!;
    const load = vi.fn(async () => loadedWithoutSources(brush));
    const previews = new BrushPreviewQueue();
    const tile = compactBrushTile(brush, null, { choose: vi.fn(), edit: vi.fn(),
      menu: vi.fn(), reorder: vi.fn(), load, shell: shellPort(() => undefined), previews });
    disposeCompactBrushTile(tile);
    await previews.whenIdle();
    expect(load).not.toHaveBeenCalled();
  });

  it("paints a persistent cache hit without decoding the brush", async () => {
    const brush = BUNDLED_BRUSHES[0]!, load = vi.fn(pendingLoad);
    const cache = new BrushPreviewCache();
    cache.write(brush, new Uint8ClampedArray(80 * 80 * 4));
    const previews = new BrushPreviewQueue();
    const tile = compactBrushTile(brush, null, { choose: vi.fn(), edit: vi.fn(),
      menu: vi.fn(), reorder: vi.fn(), load, shell: shellPort(() => undefined),
      previews, cache });
    document.body.append(tile); await previews.whenIdle();
    expect(load).not.toHaveBeenCalled();
  });
});

function pendingLoad(_brush: BrushPreset): Promise<LoadedBrush> {
  return new Promise(() => undefined);
}

function loadedWithoutSources(brush: BrushPreset): LoadedBrush {
  return { ...brush, shapeMap: null, grainMap: null, nativeShapeMap: null,
    nativeGrainMap: null, compatibility: { archiveVersion: null, archiveName: null,
      supportedFields: [], unsupportedActiveFields: [],
      excludedSections: ["wet-mix", "color-dynamics", "materials"],
      shapeSourceState: "missing", grainSourceState: "missing",
      missingSourceNames: [] }, warnings: [] };
}

function shellPort(attach: (save: () => void) => void): CompactBrushShellPort {
  return { registerOpen: vi.fn(), mountFloating: vi.fn(), showMenu: vi.fn(),
    attachReorder: (_tile, save) => attach(save), selectLegacyBrush: vi.fn() };
}
