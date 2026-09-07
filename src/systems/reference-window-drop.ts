import { $, toast, t } from "../core/shell.ts";

const IMG_EXT = /\.(png|jpe?g|gif|webp|bmp|avif|svg)$/i;

export const isImageFile = (f: File | null | undefined): boolean =>
  !!f && ((f.type || "").startsWith("image/") || IMG_EXT.test(f.name || ""));

const hasFiles = (e: DragEvent): boolean => !!e.dataTransfer &&
  ([...(e.dataTransfer.types || [])].includes("Files") ||
    e.dataTransfer.files.length > 0);

const imageFiles = (e: DragEvent): File[] =>
  [...(e.dataTransfer?.files ?? [])].filter(isImageFile);

export function bindReferenceDrop(loadFile: (file: File) => void): void {
  const win = $("refwin"); if (!win) return;
  let depth = 0;
  const over = (on: boolean) => win.classList.toggle("drop-over", on);
  const stop = (e: DragEvent): boolean => {
    if (!hasFiles(e)) return false;
    e.preventDefault(); e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    return true;
  };
  win.addEventListener("dragenter", (e) => { if (stop(e)) { depth++; over(true); } });
  win.addEventListener("dragover", stop);
  win.addEventListener("dragleave", (e) => {
    if (!stop(e)) return;
    const related = e.relatedTarget;
    if (related instanceof Node && win.contains(related)) return;
    depth = Math.max(0, depth - 1); if (!depth) over(false);
  });
  win.addEventListener("drop", (e) => {
    if (!stop(e)) return;
    depth = 0; over(false);
    const files = imageFiles(e);
    if (files.length) files.forEach((f) => loadFile(f));
    else if (e.dataTransfer?.files.length) toast(t("toast.notImage"));
  });
}
