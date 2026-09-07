interface TextBoxSource {
  readonly transform: { readonly scaleX: number; readonly scaleY: number };
  box: { w: number; h: number };
}
interface EditorMetrics {
  readonly scrollWidth: number;
  readonly scrollHeight: number;
}

const EXTRA_PX = 2;
const safeScale = (v: number): number => Math.max(0.01, Math.abs(v || 1));

export function fitBoxToEditor(src: TextBoxSource, ed: EditorMetrics,
  zoom: number): void {
  const zx = Math.max(1, zoom * safeScale(src.transform.scaleX));
  const zy = Math.max(1, zoom * safeScale(src.transform.scaleY));
  src.box.w = Math.max(src.box.w, Math.ceil((ed.scrollWidth + EXTRA_PX) / zx));
  src.box.h = Math.max(src.box.h, Math.ceil((ed.scrollHeight + EXTRA_PX) / zy));
}
