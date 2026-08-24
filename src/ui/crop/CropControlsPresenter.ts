export interface CropControlsPort {
  readonly active: () => boolean;
  readonly apply: () => void;
  readonly bindCanvasMode: () => void;
  readonly cancel: () => void;
  readonly dimensionInput: (dimension: "h" | "w", commit: boolean) => void;
  readonly toggle: () => void;
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
