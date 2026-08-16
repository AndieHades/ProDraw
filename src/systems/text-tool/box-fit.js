const EXTRA_PX = 2;
const safeScale = (v) => Math.max(0.01, Math.abs(v || 1));

export function fitBoxToEditor(src, ed, zoom) {
  const zx = Math.max(1, zoom * safeScale(src.transform.scaleX));
  const zy = Math.max(1, zoom * safeScale(src.transform.scaleY));
  src.box.w = Math.max(src.box.w, Math.ceil((ed.scrollWidth + EXTRA_PX) / zx));
  src.box.h = Math.max(src.box.h, Math.ceil((ed.scrollHeight + EXTRA_PX) / zy));
}
