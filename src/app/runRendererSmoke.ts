import type { PlatformPort } from "../contracts/platform";
import { renderBrushDab } from "../core/brush/renderBrushDab";
import { BrushCatalog } from "../core/brush/BrushCatalog";
import { BrushSourceCatalog } from "../core/brush/BrushSourceCatalog";
import type { BrushLibraryService } from "../core/brush-library/BrushLibraryService";
import { createRasterDocument } from "../core/document/createRasterDocument";
import { restoreDocument, serializeDocument } from "../core/persistence/documentSerialization";
import type { DocumentRepository } from "../core/persistence/DocumentRepository";
import { TileHistory } from "../core/history/TileHistory";

interface SmokeResult {
  readonly ok: boolean;
  readonly brushFiles?: number;
  readonly alpha?: number;
  readonly sourceResources?: number;
  readonly error?: string;
}

function report(result: SmokeResult): void {
  document.documentElement.dataset.prodrawSmoke = JSON.stringify(result);
}

export function rendererSmokeRequested(): boolean {
  return new URLSearchParams(window.location.search).get("smoke") === "1";
}

export function reportRendererSmokeFailure(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  report({ ok: false, error: message });
}

export async function runRendererSmoke(
  platform: PlatformPort,
  repository: DocumentRepository,
  library: BrushLibraryService
): Promise<void> {
  if (platform.kind !== "windows" || !platform.brushStorage || !window.prodrawDesktop) {
    throw new Error("Desktop preload bridge is unavailable");
  }
  if (!document.querySelector("#paint-canvas")) throw new Error("Raster workspace did not mount");
  const mainSet = library.snapshot.sets.find(({ name }) => name === "Main");
  const brush = mainSet?.brushes[0];
  if (!mainSet || !brush) throw new Error("Bundled brush catalog is empty");
  const storedMain = (await platform.brushStorage.listSets())
    .find(({ name }) => name === "Main");
  if (!storedMain?.seeded || storedMain.seedVersion !== 2 || storedMain.files.length < 12) {
    throw new Error("Bundled brush seed did not complete");
  }
  const brushBytes = await platform.brushStorage.readFile("Main", brush.fileName);
  if (!brushBytes.byteLength) throw new Error("Seeded brush cannot be read through IPC");
  const brushes = library.snapshot.sets.flatMap(({ brushes }) => brushes);
  const brushCatalog = new BrushCatalog(platform.brushStorage);
  const resources = await new BrushSourceCatalog().collect(brushes,
    (candidate) => brushCatalog.load(candidate));
  if (resources.filter(({ kind }) => kind === "shape").length < 3 ||
      resources.filter(({ kind }) => kind === "grain").length < 5) {
    throw new Error("Bundled Shape/Grain Source Library is incomplete");
  }

  const ids = ["smoke-document", "smoke-layer"];
  const smokeDocument = createRasterDocument({ name: "Smoke", width: 32, height: 32,
    dpi: 72, layerName: "Paint" }, () => ids.shift() ?? "smoke-id");
  const history = new TileHistory(2);
  history.registerSurface(smokeDocument.activeLayer.surface);
  const edit = history.begin(smokeDocument.activeLayer.surface, "Smoke stroke");
  renderBrushDab(edit, brush,
    { x: 16, y: 16, pressure: 1, tiltX: 0, tiltY: 0, time: 1 },
    { size: 12, opacity: 1, erase: false },
    { red: 220, green: 40, blue: 80, alpha: 255 });
  if (!history.record(edit.commit())) throw new Error("Smoke stroke changed no RGBA tiles");
  const paintedAlpha = smokeDocument.compositePixel(16, 16).alpha;
  if (paintedAlpha === 0) throw new Error("Smoke stroke is transparent");
  history.undo();
  if (smokeDocument.compositePixel(16, 16).alpha !== 0) throw new Error("Smoke undo failed");
  history.redo();

  await repository.saveCurrent(serializeDocument(smokeDocument));
  const saved = await repository.loadCurrent();
  if (!saved) throw new Error("IndexedDB smoke record is missing");
  const restoredAlpha = restoreDocument(saved).compositePixel(16, 16).alpha;
  if (restoredAlpha !== paintedAlpha) throw new Error("IndexedDB RGBA round trip differs");
  report({ ok: true, brushFiles: storedMain.files.length, alpha: restoredAlpha,
    sourceResources: resources.length });
}
