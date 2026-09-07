export function focusEditor(ed: HTMLElement, select = false): void {
  try { ed.focus({ preventScroll: true }); } catch { ed.focus(); }
  const sel = window.getSelection(); if (!sel) return;
  const range = document.createRange(); range.selectNodeContents(ed);
  if (!select) range.collapse(false);
  sel.removeAllRanges(); sel.addRange(range);
}

export function focusEditorAt(ed: HTMLElement, x: number, y: number): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  try { ed.focus({ preventScroll: true }); } catch { ed.focus(); }
  let range: Range | null = null;
  const pos = document.caretPositionFromPoint?.(x, y);
  if (pos && pos.offsetNode && ed.contains(pos.offsetNode)) {
    range = document.createRange(); range.setStart(pos.offsetNode, pos.offset);
  }
  if (!range && document.caretRangeFromPoint) {
    const r = document.caretRangeFromPoint(x, y);
    if (r && ed.contains(r.startContainer)) range = r;
  }
  if (!range) return false;
  range.collapse(true);
  const sel = window.getSelection(); if (!sel) return false;
  sel.removeAllRanges(); sel.addRange(range); return true;
}
