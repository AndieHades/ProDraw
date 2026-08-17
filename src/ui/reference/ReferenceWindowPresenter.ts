import { floatingWindow } from "../windows/FloatingWindow.ts";

export interface ReferenceWindowPort {
  readonly bindExternal: () => void;
  readonly close: () => void;
  readonly contextMenu: (event: MouseEvent) => void;
  readonly flip: () => void;
  readonly keyDown: (event: KeyboardEvent) => void;
  readonly loadFiles: (files: readonly File[]) => void;
  readonly outsidePointer: (event: PointerEvent) => void;
  readonly pointerDown: (event: PointerEvent) => void;
  readonly pointerMove: (event: PointerEvent) => void;
  readonly pointerUp: (event: PointerEvent) => void;
  readonly resize: (width: number, height: number) => void;
  readonly rotate: () => void;
  readonly subscribe: (listener: () => void) => void;
  readonly sync: () => void;
  readonly toggle: () => void;
  readonly wheel: (event: WheelEvent) => void;
}

const element = <T extends HTMLElement>(id: string): T => {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing reference-window element: ${id}`);
  return found as T;
};

export function mountReferenceWindow(port: ReferenceWindowPort): void {
  element<HTMLButtonElement>("refbtn").onclick = port.toggle;
  element<HTMLButtonElement>("ref-x").onclick = port.close;
  element<HTMLButtonElement>("ref-rot").onclick = port.rotate;
  element<HTMLButtonElement>("ref-flip").onclick = port.flip;
  const file = document.createElement("input");
  file.type = "file"; file.accept = "image/*"; file.multiple = true;
  element<HTMLButtonElement>("ref-open").onclick = () => file.click();
  file.onchange = () => {
    const files = [...(file.files ?? [])]; file.value = ""; port.loadFiles(files);
  };
  const canvas = element<HTMLCanvasElement>("refcv");
  canvas.addEventListener("pointerdown", port.pointerDown);
  window.addEventListener("pointermove", port.pointerMove);
  window.addEventListener("pointerup", port.pointerUp);
  window.addEventListener("pointercancel", port.pointerUp);
  canvas.addEventListener("wheel", port.wheel, { passive: false });
  canvas.addEventListener("contextmenu", port.contextMenu);
  window.addEventListener("pointerdown", port.outsidePointer, true);
  window.addEventListener("keydown", port.keyDown);
  port.bindExternal();
  port.subscribe(port.sync);
  floatingWindow(element("refwin"), { grip: element("refgrip"),
    handle: element("refrsz"), clampRight: 70, onResize: port.resize });
  port.sync();
}
