// Слой событий: синхронная шина. Системы шлют сигналы (emit) и подписываются
// на них (on), не вызывая друг друга напрямую. Синхронность сохраняет прежнее
// поведение прямых вызовов render()/layList().
const handlers = new Map();

export function on(event, fn) {
  let set = handlers.get(event);
  if (!set) { set = new Set(); handlers.set(event, set); }
  set.add(fn);
  return () => set.delete(fn);
}

export function emit(event, payload) {
  const set = handlers.get(event);
  if (!set) return;
  for (const fn of set) fn(payload);
}

// частый дуэт «изменился состав слоёв + нужна перерисовка» — один вызов вместо
// двух emit подряд (меньше шума и риска забыть один из сигналов)
export function emitDoc() { emit('layers'); emit('render'); }

