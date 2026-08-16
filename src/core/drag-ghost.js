// Призрак перетаскивания: клон самого элемента следует за курсором — единый
// вид для всех перетаскиваемых объектов (плитки галереи, строки слоёв).
// stack: число перетаскиваемых объектов (>1 — рисует карточки «пачкой»).
// Возвращает { move(x, y), remove() }.
export function dragGhost(el, width, stack) {
  const g = el.cloneNode(true);
  g.classList.add('drag-ghost');
  for (const c of ['dragging', 'source-gap', 'lifting', 'sel', 'on', 'marked', 'swiping-right', 'drop-into', 'drop-before', 'drop-above', 'drop-below']) g.classList.remove(c);
  g.querySelectorAll('.swipe-acts').forEach((n) => n.remove());
  const f = g.querySelector('.swipe-front'); if (f) f.style.transform = '';
  const r = el.getBoundingClientRect();
  const thumb = el.querySelector && el.querySelector('.gal-thumb');
  if (thumb) {
    const tr = thumb.getBoundingClientRect();
    g.style.setProperty('--gal-tile', Math.round(tr.width || r.width) + 'px');
  }
  g.style.margin = '0';
  g.style.width = Math.round(width || r.width) + 'px';
  if (stack && stack > 1) g.dataset.stack = stack > 2 ? '3' : '2';
  document.body.appendChild(g);
  return { move: (x, y) => { g.style.left = x + 'px'; g.style.top = y + 'px'; }, remove: () => g.remove() };
}
