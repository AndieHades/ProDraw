import { DISC_GAP, DISC_INNER_RATIO } from "../../config/color-disc.ts";

interface Rect { readonly height: number; readonly left: number; readonly top: number;
  readonly width: number }
export interface ColorDiscPort {
  readonly addCurrent: () => void;
  readonly beforePick: () => void;
  readonly discBox: () => Rect;
  readonly setHsv: (hue: number, saturation: number, value: number) => void;
  readonly state: () => { readonly hue: number; readonly saturation: number; readonly value: number };
  readonly svDiscBox: (disc: Rect) => Rect;
}

const SNAP_POINTS = [[0, 100], [50, 100], [100, 100], [100, 58],
  [100, 24], [50, 0], [0, 24], [0, 58]] as const;

export function bindColorDiscGesture(element: HTMLElement, port: ColorDiscPort): void {
  const svPoint = (event: PointerEvent): { saturation: number; value: number } | null => {
    const disc = port.discBox(), sv = port.svDiscBox(disc);
    const left = disc.left + sv.left, top = disc.top + sv.top;
    const centerX = left + sv.width / 2, centerY = top + sv.height / 2;
    if (Math.hypot(event.clientX - centerX, event.clientY - centerY) >
      Math.min(sv.width, sv.height) / 2) return null;
    return { saturation: Math.max(0, Math.min(100, (event.clientX - left) / sv.width * 100)),
      value: Math.max(0, Math.min(100, 100 - (event.clientY - top) / sv.height * 100)) };
  };
  const pick = (event: PointerEvent): "hue" | "sv" | null => {
    const disc = port.discBox();
    const dx = event.clientX - (disc.left + disc.width / 2);
    const dy = event.clientY - (disc.top + disc.height / 2);
    const distance = Math.hypot(dx, dy), outer = Math.min(disc.width, disc.height) / 2;
    const state = port.state();
    if (distance >= outer * DISC_INNER_RATIO + DISC_GAP && distance <= outer) {
      port.setHsv((Math.atan2(dy, dx) * 180 / Math.PI + 450) % 360,
        state.saturation, state.value); return "hue";
    }
    const point = svPoint(event);
    if (!point) return null;
    port.setHsv(state.hue, point.saturation, point.value); return "sv";
  };
  let dragging = false;
  let lastSvTap: { readonly at: number; readonly x: number; readonly y: number } | null = null;
  element.addEventListener("contextmenu", (event) => event.preventDefault());
  element.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0 && event.button !== 2) return;
    event.preventDefault();
    if (event.pointerType === "mouse" && event.button === 2) {
      if (pick(event)) port.addCurrent(); return;
    }
    const point = svPoint(event), now = Date.now();
    port.beforePick();
    if (point && lastSvTap && now - lastSvTap.at < 360 &&
      Math.hypot(event.clientX - lastSvTap.x, event.clientY - lastSvTap.y) < 22) {
      let best: (typeof SNAP_POINTS)[number] = SNAP_POINTS[0], distance = Infinity;
      for (const candidate of SNAP_POINTS) {
        const next = (candidate[0] - point.saturation) ** 2 + (candidate[1] - point.value) ** 2;
        if (next < distance) { distance = next; best = candidate; }
      }
      port.setHsv(port.state().hue, best[0], best[1]);
      lastSvTap = null; dragging = false; return;
    }
    const mode = pick(event); dragging = mode !== null;
    lastSvTap = mode === "sv" ? { at: now, x: event.clientX, y: event.clientY } : null;
    if (dragging) try { element.setPointerCapture(event.pointerId); } catch { /* optional */ }
  });
  element.addEventListener("pointermove", (event) => { if (dragging) pick(event); });
  const end = (): void => { dragging = false; };
  element.addEventListener("pointerup", end);
  element.addEventListener("pointercancel", end);
}
