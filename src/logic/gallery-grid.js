// Pure gallery ordering: папки и файлы в одном ряду (без отдельной секции),
// сортируются по `order` — его двигает ручная перестановка, с откатом на
// `updated`. Новые работы получают order=Date.now(), поэтому по умолчанию идут
// новейшие сверху, но ручной порядок (setOrder) имеет приоритет и не сбивается
// автосейвом, который бампает только `updated`.
const rank = (item) => item.order || item.updated || 0;

const byName = (a, b) => String(a.name || '').localeCompare(String(b.name || ''));
const byId = (a, b) => String(a.id || '').localeCompare(String(b.id || ''));

export function sortGalleryItems(items) {
  return [...items].sort((a, b) => (rank(b) - rank(a)) || byName(a, b) || byId(a, b));
}

// Новый порядок при перестановке: перетаскиваемые (ids) встают перед beforeId,
// либо в конец, если цели нет. Папки и файлы — в одном списке (любая плитка
// двигается в любое место). Возвращает id в финальном порядке (или null, если
// нечего двигать). Вызывающий записывает строго убывающий order по этому списку.
export function reorderedIds(items, ids, beforeId) {
  const moving = sortGalleryItems(items.filter((x) => ids.includes(x.id)));
  if (!moving.length) return null;
  const rest = sortGalleryItems(items.filter((x) => !ids.includes(x.id)));
  let at = beforeId ? rest.findIndex((x) => x.id === beforeId) : -1;
  if (at < 0) at = rest.length; // нет цели → в конец
  return [...rest.slice(0, at), ...moving, ...rest.slice(at)].map((x) => x.id);
}
