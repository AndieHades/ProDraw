// Shift-клик: выделить диапазон строк панели от активной (primary) до кликнутой по
// ВИДИМОМУ порядку — слои, папки и эффекты вперемешку, всё кроме фона (.bgrow в
// выборку не входит). Активная строка остаётся primary, остальные — отмеченными.
import { S } from '../../core/state.js';

const SEL = '#lay-list .lrow, #lay-list .fxrow'; // выбираемые строки (фон исключён)

// DOM-строка текущей активной единицы: эффект → папка → слой (тот же приоритет,
// что и при отрисовке «on»). Возвращает индекс в списке rows или -1.
function anchorIndex(rows) {
  if (S.fxCur) return rows.findIndex((r) => r.__eff === S.fxCur);
  if (S.selFolder != null) return rows.findIndex((r) => +r.dataset.fid === S.selFolder);
  return rows.findIndex((r) => r.dataset.li != null && +r.dataset.li === S.cur);
}

// Выделить диапазон от активной строки до targetEl. Возвращает false, если активная
// строка не отрисована (свёрнута в папке) — тогда вызывающий делает обычный выбор.
export function selectRange(targetEl) {
  if (S.bgSel) return false; // фон активен — он не входит в мультивыбор; пусть будет обычный одиночный выбор
  const rows = [...document.querySelectorAll(SEL)];
  const a = anchorIndex(rows), b = rows.indexOf(targetEl);
  if (a < 0 || b < 0) return false;
  S.bgSel = false; S.marked = new Set(); S.markedFolders = new Set(); S.fxSel = new Set();
  for (let k = Math.min(a, b); k <= Math.max(a, b); k++) { const r = rows[k];
    if (r.dataset.li != null) S.marked.add(+r.dataset.li);
    else if (r.dataset.fid != null) S.markedFolders.add(+r.dataset.fid);
    else if (r.__eff) S.fxSel.add(r.__eff); }
  // ровно одна primary-строка — по типу активной (остальные primary-флаги гасим)
  if (S.fxCur) S.selFolder = null; // активный эффект уже в fxSel
  else if (S.selFolder != null) S.fxCur = null; // активная папка уже в markedFolders
  else { S.marked.delete(S.cur); S.selFolder = null; S.fxCur = null; } // активный слой — вне marked
  return true;
}
