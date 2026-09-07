export interface PaletteDragGap {
  readonly target?: HTMLElement | null;
  readonly after?: boolean;
  readonly active?: boolean;
  remove(): void;
}

export interface PaletteDrag {
  readonly gap?: PaletteDragGap | null;
  readonly rmb?: boolean;
  readonly moved?: boolean;
  readonly selecting?: boolean;
  readonly lifted?: boolean;
  readonly reordering?: boolean;
  readonly moveSel?: boolean;
  readonly idx: number;
  readonly idxs?: readonly number[];
  readonly moveIdxs?: readonly number[];
}

export interface PaletteDragPort {
  openContext(x: number, y: number, index: number): void;
  rebuild(): void;
  squelch(): void;
  selectShade(indices: readonly number[], index: number): void;
  dropColor(index: number, x: number, y: number): void;
  reorder(indices: readonly number[] | undefined, target: number,
    after: boolean, moveSel: boolean | undefined): boolean;
}

export function finishPaletteDrag(drag: PaletteDrag, event: PointerEvent | null,
  port: PaletteDragPort): void {
  const point = event ? document.elementFromPoint(event.clientX, event.clientY) : null;
  const targetSwatch = drag.gap?.target ||
    (point?.closest ? point.closest<HTMLElement>("#pal .sw:not(.plus)") : null);
  const gapAfter = !!drag.gap?.after, gapActive = !!drag.gap?.active;
  drag.gap?.remove();
  if (drag.rmb) {
    if (!drag.moved && event) port.openContext(event.clientX, event.clientY, drag.idx);
    else port.rebuild();
    return;
  }
  if (drag.selecting) {
    port.squelch();
    if ((drag.idxs?.length ?? 0) > 1) port.selectShade(drag.idxs ?? [], drag.idx);
    return;
  }
  if (drag.lifted && !drag.moved) {
    if (event) port.openContext(event.clientX, event.clientY, drag.idx);
    return;
  }
  if (!drag.reordering) return;
  port.squelch();
  const onPalette = point?.closest && point.closest("#pal");
  if (!onPalette && !drag.moveSel && event) {
    port.dropColor(drag.idx, event.clientX, event.clientY);
    port.rebuild(); return;
  }
  if (targetSwatch && event) {
    const rect = targetSwatch.getBoundingClientRect();
    const after = gapActive ? gapAfter : event.clientX >= rect.left + rect.width / 2;
    if (port.reorder(drag.moveIdxs, Number(targetSwatch.dataset["i"]), after,
      drag.moveSel)) { port.rebuild(); return; }
  }
  port.rebuild();
}
