interface PanZoomView { z: number; x: number; y: number }
interface PanZoomOptions {
  readonly min?: number;
  readonly max?: number;
  readonly render: () => void;
  readonly onPick?: (event: PointerEvent) => void;
}
interface Point { readonly x: number; readonly y: number }
interface PointerStart extends Point {
  readonly vx: number; readonly vy: number; moved: boolean;
}
interface PinchStart { readonly distance: number; readonly zoom: number }

export function attachPanZoom(canvas: HTMLCanvasElement, view: PanZoomView,
  options: PanZoomOptions): void {
  const minimum = options.min ?? 0.1, maximum = options.max ?? 40;
  const pointers = new Map<number, Point>();
  let pointer: PointerStart | null = null, pinch: PinchStart | null = null;

  canvas.addEventListener("pointerdown", (event) => {
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 2) {
      const [first, second] = pointers.values();
      if (first && second) pinch = { distance: Math.hypot(first.x - second.x,
        first.y - second.y), zoom: view.z };
      pointer = null; return;
    }
    pointer = { x: event.clientX, y: event.clientY,
      vx: view.x, vy: view.y, moved: false };
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!pointers.has(event.pointerId) && event.buttons === 0) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size >= 2 && pinch) {
      const [first, second] = pointers.values(); if (!first || !second) return;
      const distance = Math.hypot(first.x - second.x, first.y - second.y);
      const midpoint = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
      const bounds = canvas.getBoundingClientRect();
      const worldX = (midpoint.x - bounds.left - view.x) / view.z;
      const worldY = (midpoint.y - bounds.top - view.y) / view.z;
      view.z = Math.max(minimum, Math.min(maximum,
        pinch.zoom * distance / Math.max(1e-6, pinch.distance)));
      view.x = midpoint.x - bounds.left - worldX * view.z;
      view.y = midpoint.y - bounds.top - worldY * view.z;
      options.render(); return;
    }
    if (!pointer) return;
    if (Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 4)
      pointer.moved = true;
    if (pointer.moved) {
      view.x = pointer.vx + event.clientX - pointer.x;
      view.y = pointer.vy + event.clientY - pointer.y; options.render();
    }
  });

  const end = (event: PointerEvent): void => {
    pointers.delete(event.pointerId); if (pointers.size < 2) pinch = null;
    if (pointer && !pointer.moved) options.onPick?.(event); pointer = null;
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault(); const bounds = canvas.getBoundingClientRect();
    const mouseX = event.clientX - bounds.left, mouseY = event.clientY - bounds.top;
    const worldX = (mouseX - view.x) / view.z, worldY = (mouseY - view.y) / view.z;
    view.z = Math.max(minimum, Math.min(maximum,
      view.z * (event.deltaY < 0 ? 1.12 : 0.89)));
    view.x = mouseX - worldX * view.z; view.y = mouseY - worldY * view.z;
    options.render();
  }, { passive: false });
}
