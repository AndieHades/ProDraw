export function finishPaletteDrag(drag, event, port) {
  const target = event ? document.elementFromPoint(event.clientX, event.clientY) : null;
  const targetSwatch = drag.gap?.target ||
    (target?.closest ? target.closest('#pal .sw:not(.plus)') : null);
  const gapAfter = !!drag.gap?.after, gapActive = !!drag.gap?.active;
  drag.gap?.remove();
  if (drag.rmb) {
    if (!drag.moved && event) port.openContext(event.clientX, event.clientY, drag.idx);
    else port.rebuild();
    return;
  }
  if (drag.selecting) {
    port.squelch();
    if (drag.idxs?.length > 1) port.selectShade(drag.idxs, drag.idx);
    return;
  }
  if (drag.lifted && !drag.moved) {
    if (event) port.openContext(event.clientX, event.clientY, drag.idx);
    return;
  }
  if (!drag.reordering) return;
  port.squelch();
  const onPalette = target?.closest && target.closest('#pal');
  if (!onPalette && !drag.moveSel && event) {
    port.dropColor(drag.idx, event.clientX, event.clientY);
    port.rebuild(); return;
  }
  if (targetSwatch && event) {
    const rect = targetSwatch.getBoundingClientRect();
    const after = gapActive ? gapAfter : event.clientX >= rect.left + rect.width / 2;
    if (port.reorder(drag.moveIdxs, +targetSwatch.dataset.i, after, drag.moveSel)) {
      port.rebuild(); return;
    }
  }
  port.rebuild();
}
