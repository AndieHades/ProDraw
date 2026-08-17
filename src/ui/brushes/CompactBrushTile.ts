import type { BrushPreset, LoadedBrush } from "../../contracts/brush";
import type { BrushPreviewJob } from "./BrushPreviewQueue";
import { BrushPreviewQueue } from "./BrushPreviewQueue";
import { renderCompactBrushPreview } from "./renderBrushPreview";
import type { CompactBrushShellPort } from "./CompactBrushShellPort";

export interface CompactBrushTileActions {
  readonly choose: (brush: BrushPreset) => void;
  readonly edit: (brush: BrushPreset) => void;
  readonly menu: (brush: BrushPreset, event: PointerEvent) => void;
  readonly reorder: (brush: BrushPreset, tile: HTMLElement) => void;
  readonly load: (brush: BrushPreset) => Promise<LoadedBrush>;
  readonly shell: CompactBrushShellPort;
  readonly previews: BrushPreviewQueue;
}

const cleanupByTile = new WeakMap<HTMLElement, () => void>();

export function compactBrushTile(brush: BrushPreset, activeId: string | null,
  actions: CompactBrushTileActions): HTMLDivElement {
  const tile = document.createElement("div");
  tile.className = `btile${brush.id === activeId ? " on" : ""}`;
  tile.dataset.brushId = brush.id;
  tile.dataset.brushSet = brush.setName;
  tile.title = brush.name;
  tile.setAttribute("aria-label", brush.name);
  const preview = document.createElement("canvas");
  preview.className = "btile-ic";
  renderFallbackTip(preview, brush.shape.hardness);
  const name = document.createElement("span");
  name.className = "bname"; name.textContent = brush.name;
  tile.append(preview, name);

  let rightDown: { readonly x: number; readonly y: number } | null = null;
  let squelchUntil = 0;
  tile.addEventListener("pointerdown", (event) => {
    if (event.button === 2) rightDown = { x: event.clientX, y: event.clientY };
  });
  tile.addEventListener("pointerup", (event) => {
    if (event.button !== 2 || !rightDown) return;
    const moved = Math.hypot(event.clientX - rightDown.x,
      event.clientY - rightDown.y) > 4;
    rightDown = null;
    if (!moved && performance.now() >= squelchUntil) {
      actions.choose(brush); actions.menu(brush, event);
    }
  });
  tile.addEventListener("click", () => {
    if (performance.now() >= squelchUntil) actions.choose(brush);
  });
  tile.addEventListener("dblclick", (event) => {
    event.preventDefault();
    if (performance.now() >= squelchUntil) actions.edit(brush);
  });
  tile.addEventListener("contextmenu", (event) => event.preventDefault());
  actions.shell.attachReorder(tile, () => actions.reorder(brush, tile),
    () => { squelchUntil = performance.now() + 350; });
  attachVisiblePreview(tile, preview, brush, actions);
  return tile;
}

export function disposeCompactBrushTile(tile: HTMLElement): void {
  cleanupByTile.get(tile)?.();
  cleanupByTile.delete(tile);
}

function attachVisiblePreview(tile: HTMLElement, preview: HTMLCanvasElement,
  brush: BrushPreset, actions: CompactBrushTileActions): void {
  let observer: IntersectionObserver | null = null;
  let job: BrushPreviewJob | null = null;
  let rendered = false;
  const schedule = (): void => {
    if (job || rendered) return;
    const scheduled = actions.previews.schedule(async (signal) => {
      if (signal.aborted || !tile.isConnected) return;
      const loaded = await actions.load(brush);
      if (signal.aborted || !tile.isConnected) return;
      renderCompactBrushPreview(preview, loaded);
      rendered = true;
      observer?.disconnect();
    });
    job = scheduled;
    void scheduled.finished.finally(() => {
      if (job === scheduled && !rendered) job = null;
    });
  };
  if (typeof IntersectionObserver === "undefined") schedule();
  else {
    observer = new IntersectionObserver((entries) => {
      if (entries.some(({ isIntersecting }) => isIntersecting)) schedule();
      else if (!rendered) { job?.cancel(); job = null; }
    });
    observer.observe(tile);
  }
  cleanupByTile.set(tile, () => { observer?.disconnect(); job?.cancel(); });
}

function renderFallbackTip(canvas: HTMLCanvasElement, hardness: number): void {
  const size = 80;
  canvas.width = size; canvas.height = size;
  const context = canvas.getContext("2d"); if (!context) return;
  const gradient = context.createRadialGradient(40, 40, 3, 40, 40, 36);
  const edge = Math.max(0.05, Math.min(0.98, hardness));
  gradient.addColorStop(0, "rgba(245,245,248,1)");
  gradient.addColorStop(edge, "rgba(245,245,248,1)");
  gradient.addColorStop(1, "rgba(245,245,248,0)");
  context.fillStyle = gradient;
  context.beginPath(); context.arc(40, 40, 36, 0, Math.PI * 2); context.fill();
}
