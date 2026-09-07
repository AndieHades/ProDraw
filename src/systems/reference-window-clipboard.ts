// Буфер обмена окна референсов: копирование выбранных картинок одним PNG,
// вставка из системного буфера и сохранение файла.
import { makeCanvas } from "../core/canvas.ts";
import { toast, t } from "../core/shell.ts";

export interface RefItem {
  readonly x: number; readonly y: number; readonly w: number; readonly h: number;
}
export interface RefRecord {
  readonly ready: boolean;
  readonly img: CanvasImageSource;
}
type RecordOf = (item: RefItem) => RefRecord;

let fallbackUrl: string | null = null;

const toBlob = (canvas: HTMLCanvasElement): Promise<Blob | null> =>
  new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"));

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => { const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject; reader.readAsDataURL(blob); });

function bounds(items: readonly RefItem[]): RefItem {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const item of items) {
    x0 = Math.min(x0, item.x); y0 = Math.min(y0, item.y);
    x1 = Math.max(x1, item.x + item.w); y1 = Math.max(y1, item.y + item.h);
  }
  return { x: x0, y: y0, w: Math.max(1, Math.ceil(x1 - x0)),
    h: Math.max(1, Math.ceil(y1 - y0)) };
}

export function refsCanvas(items: readonly RefItem[], getRec: RecordOf,
  single = false): HTMLCanvasElement | null {
  const first = items[0]; if (!first) return null;
  const box = single ? first : bounds(items);
  const canvas = makeCanvas(Math.ceil(box.w), Math.ceil(box.h));
  const context = canvas.getContext("2d"); if (!context) return null;
  for (const item of items) { const record = getRec(item);
    if (record.ready) context.drawImage(record.img, item.x - box.x, item.y - box.y,
      item.w, item.h); }
  return canvas;
}

export async function copyRefs(items: readonly RefItem[], getRec: RecordOf): Promise<void> {
  const canvas = refsCanvas(items, getRec); if (!canvas) return;
  fallbackUrl = canvas.toDataURL("image/png");
  try {
    const blob = await toBlob(canvas);
    if (blob && navigator.clipboard && "ClipboardItem" in window) {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    }
  } catch { /* системный буфер недоступен — остаётся внутренний */ }
  toast(t("toast.copied", { s: "PNG" }));
}

export async function pasteRef(add: (url: string) => void): Promise<boolean> {
  try {
    if (navigator.clipboard?.read) for (const item of await navigator.clipboard.read()) {
      const type = item.types.find((value) => value.startsWith("image/"));
      if (!type) continue;
      add(await blobToDataUrl(await item.getType(type)));
      toast(t("toast.pasted")); return true;
    }
  } catch { /* системный буфер недоступен — пробуем внутренний */ }
  if (fallbackUrl) { add(fallbackUrl); toast(t("toast.pasted")); return true; }
  toast(t("toast.bufferEmpty")); return false;
}

export function saveRef(item: RefItem, getRec: RecordOf): void {
  const canvas = refsCanvas([item], getRec, true); if (!canvas) return;
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png"); link.download = "reference.png";
  link.click();
}
