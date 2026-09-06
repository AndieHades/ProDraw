const FILE_DRAG_TYPES = new Set([
  "files",
  "public.file-url",
  "text/uri-list",
]);

function values<T>(source: ArrayLike<T> | Iterable<T> | null | undefined): T[] {
  if (!source) return [];
  return Array.from(source);
}

export function isFileDrag(transfer: DataTransfer | null): boolean {
  if (!transfer) return false;
  if (values(transfer.files).length > 0) return true;
  if (values(transfer.items).some((item) => item.kind === "file")) return true;
  return values(transfer.types).some((type) => FILE_DRAG_TYPES.has(type.toLowerCase()));
}

export function firstDroppedFile(transfer: DataTransfer | null): File | null {
  if (!transfer) return null;
  const direct = values(transfer.files)[0];
  if (direct) return direct;
  for (const item of values(transfer.items)) {
    if (item.kind !== "file") continue;
    const file = item.getAsFile();
    if (file) return file;
  }
  return null;
}

export function bindFileDrop(
  target: Window,
  show: (visible: boolean) => void,
  onFile: (file: File) => void
): void {
  let depth = 0;
  target.addEventListener("pxh:drop-reset", () => { depth = 0; show(false); });
  target.addEventListener("dragover", (event) => {
    if (!isFileDrag(event.dataTransfer)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  });
  target.addEventListener("dragenter", (event) => {
    if (!isFileDrag(event.dataTransfer)) return;
    event.preventDefault(); depth++; show(true);
  });
  target.addEventListener("dragleave", () => {
    depth = Math.max(0, depth - 1);
    if (!depth) show(false);
  });
  target.addEventListener("drop", (event) => {
    if (!isFileDrag(event.dataTransfer)) return;
    event.preventDefault(); depth = 0; show(false);
    const file = firstDroppedFile(event.dataTransfer);
    if (file) onFile(file);
  });
}
