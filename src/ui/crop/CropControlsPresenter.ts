export interface CropControlsPort {
  readonly active: () => boolean;
  readonly apply: () => void;
  readonly bindCanvasMode: () => void;
  readonly cancel: () => void;
  readonly dimensionInput: (dimension: "h" | "w", commit: boolean) => void;
  readonly gridChanged: (visible: boolean) => void;
  readonly setCellSize: (commit: boolean) => void;
  readonly subscribeGrid: (listener: () => void) => void;
  readonly syncGrid: () => void;
  readonly toggle: () => void;
  readonly toggleLink: () => void;
  readonly toggleSymmetry: () => void;
  readonly toggleTrim: () => void;
  readonly toggleUnits: () => void;
}

const element = <T extends HTMLElement>(id: string): T => {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing crop-control element: ${id}`);
  return found as T;
};

function commitOnEnter(input: HTMLInputElement): void {
  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault(); event.stopPropagation(); input.blur();
  });
}

export function mountCropControls(port: CropControlsPort): void {
  element<HTMLButtonElement>("crop").onclick = port.toggle;
  element<HTMLButtonElement>("crop-ok").onclick = port.apply;
  element<HTMLButtonElement>("crop-cancel").onclick = port.cancel;
  element<HTMLButtonElement>("crop-sym").onclick = port.toggleSymmetry;
  element<HTMLButtonElement>("crop-link").onclick = port.toggleLink;
  element<HTMLButtonElement>("crop-units").onclick = port.toggleUnits;
  element<HTMLButtonElement>("crop-trim").onclick = port.toggleTrim;
  const gridVisible = element<HTMLInputElement>("crop-grid-visible");
  gridVisible.addEventListener("change", () => port.gridChanged(gridVisible.checked));
  const cellSize = element<HTMLInputElement>("crop-cell-size");
  cellSize.addEventListener("input", () => port.setCellSize(false));
  cellSize.addEventListener("blur", () => port.setCellSize(true));
  commitOnEnter(cellSize);
  port.subscribeGrid(port.syncGrid); port.syncGrid();
  for (const dimension of ["w", "h"] as const) {
    const input = element<HTMLInputElement>(`crop-${dimension}`);
    input.addEventListener("input", () => port.dimensionInput(dimension, false));
    input.addEventListener("blur", () => port.dimensionInput(dimension, true));
    commitOnEnter(input);
  }
  port.bindCanvasMode();
  window.addEventListener("keydown", (event) => {
    if (!port.active()) return;
    if (event.key === "Enter") { event.preventDefault(); port.apply(); }
    else if (event.key === "Escape") { event.preventDefault(); port.cancel(); }
  });
}
