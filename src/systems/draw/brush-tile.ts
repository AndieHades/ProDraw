// Плитка библиотеки кистей: превью рисует тот же движок, что и ход, поэтому
// видно форму и зерно кисти, а не первую букву её имени.
import type { LoadedBrush } from "../../contracts/brush.ts";
import { brushPreviewPixels } from "./brush-preview.ts";

export interface BrushTileRequest {
  readonly key: string;
  readonly label: string;
  readonly selected: boolean;
  readonly ink: readonly [number, number, number];
  readonly choose: () => void;
  readonly brush?: LoadedBrush | null;
  readonly square?: boolean;
}

const SIDE = 74;
// Превью не зависит от выбора и подписи, поэтому считается один раз на кисть.
const cache = new Map<string, Uint8ClampedArray>();

// Цвет мазка берём из темы: превью должно читаться и на светлой, и на тёмной.
export function panelInk(): [number, number, number] {
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;color:var(--txt)";
  document.body.append(probe);
  const parts = getComputedStyle(probe).color.match(/\d+/g);
  probe.remove();
  return parts && parts.length >= 3
    ? [Number(parts[0]), Number(parts[1]), Number(parts[2])] : [20, 20, 20];
}

function preview(request: BrushTileRequest): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.className = "btile-ic"; canvas.width = SIDE; canvas.height = SIDE;
  const context = canvas.getContext("2d"); if (!context) return canvas;
  const id = `${request.key}|${request.ink.join(",")}|${request.brush ? 1 : 0}`;
  let pixels = cache.get(id);
  if (!pixels) { pixels = brushPreviewPixels({ width: SIDE, height: SIDE,
    brush: request.brush ?? null, square: !!request.square }, request.ink);
    cache.set(id, pixels); }
  const image = context.createImageData(SIDE, SIDE);
  image.data.set(pixels); context.putImageData(image, 0, 0); return canvas;
}

export function brushTile(request: BrushTileRequest): HTMLButtonElement {
  const tile = document.createElement("button");
  tile.className = `btile${request.selected ? " on" : ""}`;
  tile.title = request.label;
  const name = document.createElement("span");
  name.className = "bname"; name.textContent = request.label;
  tile.append(preview(request), name);
  tile.onclick = request.choose;
  return tile;
}
