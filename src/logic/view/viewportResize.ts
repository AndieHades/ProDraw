// Изменение размера окна не должно менять масштаб или сбрасывать панораму:
// точка документа под центром вьюпорта остаётся под центром.
export interface ViewportSize { readonly width: number; readonly height: number }
export interface ViewOffset { readonly ox: number; readonly oy: number }

export function recentredViewOffset(view: ViewOffset, previous: ViewportSize,
  next: ViewportSize): ViewOffset {
  if (previous.width <= 0 || previous.height <= 0) return { ox: view.ox, oy: view.oy };
  return { ox: view.ox + (next.width - previous.width) / 2,
    oy: view.oy + (next.height - previous.height) / 2 };
}
