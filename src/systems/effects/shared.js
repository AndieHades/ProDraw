// Общие данные системы эффектов: активная цель (слой/папка), цели для вставки,
// и буфер обмена эффектов. Цель = объект с полем .effects.
import { S } from '../../core/state.js';
import { folderById } from '../../core/layers.js';

// объект, к которому привязываются новые эффекты: если активна строка эффекта/
// настройки — её владелец (слой/папка), не сам эффект; иначе выбранная папка или
// активный слой. Так «добавить эффект/настройку» при выбранном эффекте идёт к слою.
export const activeTarget = () => {
  if (S.fxCur) { const o = ownerOf(S.fxCur); if (o) return o; }
  return S.selFolder != null ? folderById(S.selFolder) : S.layers[S.cur];
};

// цели вставки: отмеченные слои (+активный) и выбранные папки; минимум — активная цель
export function pasteTargets() {
  const out = []; const li = new Set([...S.marked]); if (S.selFolder == null) li.add(S.cur);
  for (const i of li) if (S.layers[i]) out.push(S.layers[i]);
  for (const fid of new Set([...(S.selFolder != null ? [S.selFolder] : []), ...S.markedFolders])) {
    const f = folderById(fid); if (f && !out.includes(f)) out.push(f); }
  if (!out.length) { const a = activeTarget(); if (a) out.push(a); }
  return out;
}

// владелец эффекта (слой или папка, в чьём .effects он лежит) и его индекс
export function ownerOf(eff) {
  for (const L of S.layers) { const i = L.effects.indexOf(eff); if (i >= 0) return L; }
  for (const f of S.folders) { const i = (f.effects || []).indexOf(eff); if (i >= 0) return f; }
  return null;
}
// выделенные эффекты в порядке стека их владельцев (стабильно для копий/удаления)
export function selectedEffects() {
  if (!S.fxSel.size && S.fxCur) return [S.fxCur];
  const out = [];
  for (const L of S.layers) for (const e of L.effects) if (S.fxSel.has(e)) out.push(e);
  for (const f of S.folders) for (const e of (f.effects || [])) if (S.fxSel.has(e)) out.push(e);
  return out;
}

let fxClip = []; // последний скопированный набор эффектов (данные)
export const getFxClip = () => fxClip;
export const setFxClip = (a) => { fxClip = a; };
