// Взвешенный случайный выбор варианта из списка. Чистая логика: RNG передаётся
// аргументом (детерминируемо в тестах). items = [{ id, weight }].
export function weightedPick(items, rng = Math.random) {
  if (!items.length) return null;
  let total = 0; for (const it of items) total += Math.max(0, it.weight || 0);
  if (total <= 0) return items[Math.floor(rng() * items.length)].id; // все веса 0 → равномерно
  let r = rng() * total;
  for (const it of items) { r -= Math.max(0, it.weight || 0); if (r < 0) return it.id; }
  return items[items.length - 1].id;
}
