// Данные-операции переноса эффектов (сам drag — общий dragRow из layers/drag.js).
// Перенос меняет массивы .effects владельцев: переупорядочивание внутри стека или
// применение эффекта к другому слою/папке. Верх списка = верх стека (как у слоёв).
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { snapshot } from '../../core/history.js';
import { dirtyAll } from '../../core/layer-cache.js';

const ownerIndex = (eff) => { for (const L of S.layers) { const i = L.effects.indexOf(eff); if (i >= 0) return [L, i]; }
  for (const f of S.folders) { const i = (f.effects || []).indexOf(eff); if (i >= 0) return [f, i]; } return [null, -1]; };

const rowTarget = (row) => (row.dataset.li != null ? S.layers[+row.dataset.li]
  : row.dataset.fid != null ? S.folders.find((f) => f.id === +row.dataset.fid) : null);

// весь перетаскиваемый набор эффектов (в порядке стека), если тянем выделенную группу
export function fxBlock(eff) { if (!(S.fxSel.has(eff) && S.fxSel.size > 1)) return [eff]; const out = [];
  for (const L of S.layers) for (const e of L.effects) if (S.fxSel.has(e)) out.push(e);
  for (const f of S.folders) for (const e of (f.effects || [])) if (S.fxSel.has(e)) out.push(e); return out; }

// row — строка эффекта (вставка над/под, верх списка = верх стека) или строка слоя/папки
// (применить к ней — встать наверх её стека эффектов). below — нижняя половина строки.
export function fxDrop(blk, row, below) { let owner, at;
  if (row.classList.contains('fxrow')) { if (blk.includes(row.__eff)) return;
    const [o, j] = ownerIndex(row.__eff); if (!o) return; owner = o; at = below ? j : j + 1; }
  else { owner = rowTarget(row); if (!owner) return; if (!owner.effects) owner.effects = []; at = owner.effects.length; }
  snapshot();
  for (const e of blk) { const [o, k] = ownerIndex(e); if (o) { o.effects.splice(k, 1); if (o === owner && k < at) at--; } }
  owner.effects.splice(at, 0, ...blk); dirtyAll(); bus.emitDoc(); } // dirtyAll — гарантированно сбросить кеш эффектов на старом и новом владельце
