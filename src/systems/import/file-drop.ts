const FILE_DRAG_TYPES = new Set(["files", "public.file-url", "text/uri-list"]);

function values<T>(source: ArrayLike<T> | Iterable<T> | null | undefined): T[] {
  return source ? Array.from(source) : [];
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

// Подсказки-оверлея над окном больше нет, и обработчик намеренно не трогает
// разметку: отсутствующий узел не должен съедать брошенный файл.
export function bindFileDrop(target: Window, onFile: (file: File) => void): void {
  const accept = (event: DragEvent): boolean => {
    if (!isFileDrag(event.dataTransfer)) return false;
    event.preventDefault();
    return true;
  };
  target.addEventListener("dragenter", (event) => { accept(event); });
  target.addEventListener("dragover", (event) => {
    if (accept(event) && event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  });
  target.addEventListener("drop", (event) => {
    if (!accept(event)) return;
    const file = firstDroppedFile(event.dataTransfer);
    if (file) onFile(file);
  });
}
