// Сохранение файла на устройство: системный диалог → share → (на тач — оверлей
// с картинкой) → скачивание. Низкоуровневый сервис; что и как назвать — решают
// системы экспорта.
import * as bus from "./bus.ts";
import { t } from "../i18n/index.ts";
import { paintCanvas } from "./canvas.ts";

type GridCell = readonly number[] | null | undefined;
type GridRows = readonly (readonly GridCell[])[];

// фрагмент сетки [x0,y0,w×h] → canvas с попиксельной альфой
export function gridToCanvas(grid: GridRows, x0: number, y0: number,
  w: number, h: number): HTMLCanvasElement {
  return paintCanvas(w, h, (d) => {
    for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
      const cc = grid[y0 + y]?.[x0 + xx]; if (!cc) continue;
      const o = (y * w + xx) * 4;
      d[o] = cc[0] ?? 0; d[o + 1] = cc[1] ?? 0; d[o + 2] = cc[2] ?? 0;
      d[o + 3] = cc.length > 3 ? cc[3] ?? 255 : 255; } });
}

export function showSaveOverlay(u: string): void {
  const image = document.getElementById("ovlimg");
  if (image instanceof HTMLImageElement) image.src = u;
  document.getElementById("ovl")?.classList.add("on");
}

const aborted = (error: unknown): boolean =>
  (error as { name?: string } | null)?.name === "AbortError";

export async function saveFile(b: Blob, name: string, mime: string, desc: string,
  overlayUrl: string | null = null): Promise<void> {
  if (window.showSaveFilePicker && !matchMedia("(pointer: coarse)").matches) {
    try { const ext = "." + name.split(".").pop();
      const h = await window.showSaveFilePicker({ suggestedName: name,
        types: [{ description: desc, accept: { [mime]: [ext] } }] });
      const w = await h.createWritable(); await w.write(b); await w.close();
      bus.emit("feedback", t("toast.savedAs", { name: h.name })); return; }
    catch (e) { if (aborted(e)) return; } }
  const file = new File([b], name, { type: mime });
  if (typeof navigator !== "undefined" && navigator.canShare &&
      navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return; }
    catch (e) { if (aborted(e)) return; } }
  if (overlayUrl) { showSaveOverlay(overlayUrl); return; }
  const url = URL.createObjectURL(b), a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function saveCanvas(c: HTMLCanvasElement, name: string): void {
  c.toBlob((b) => { if (b) void saveFile(b, name, "image/png", t("file.pngDesc"),
    matchMedia("(pointer: coarse)").matches ? c.toDataURL("image/png") : null); },
    "image/png");
}
