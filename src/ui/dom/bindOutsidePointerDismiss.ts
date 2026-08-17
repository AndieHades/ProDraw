export function bindOutsidePointerDismiss(
  panel: HTMLElement,
  protectedElements: readonly HTMLElement[],
  dismiss: () => void
): () => void {
  const onPointerDown = (event: PointerEvent): void => {
    const target = event.target;
    if (!panel.classList.contains("on") || !(target instanceof Node)) return;
    if (panel.contains(target) || protectedElements.some((element) =>
      element.contains(target))) return;
    dismiss();
  };
  document.addEventListener("pointerdown", onPointerDown, true);
  return () => document.removeEventListener("pointerdown", onPointerDown, true);
}
