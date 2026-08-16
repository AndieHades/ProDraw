// Реестр именованных действий. Системы регистрируют свои команды по имени
// ('tool.pencil', 'edit.undo'…), а хоткеи/кнопки/меню вызывают их по имени —
// не зная, какая система за ними стоит. Переназначить хоткей = поменять данные.
const reg = new Map();

export const register = (name, fn) => reg.set(name, fn);
export const has = (name) => reg.has(name);
export const list = () => [...reg.keys()];
export function run(name, ...args) { const f = reg.get(name); if (!f) return false; const out = f(...args); return out === undefined ? true : out; }
