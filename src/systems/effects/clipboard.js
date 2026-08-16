// Операции с эффектами как со слоями: контекст-меню строки (Правка/Скопировать/
// Дублировать/Удалить) работает над выделением; копирование/вставка на все
// выбранные слои. Перенос/переупорядочивание — drag в списке (layers/fx-drag).
import { S, cloneFx } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { snapshot } from '../../core/history.js';
import { $, showMenuBeside, toast, t } from '../../core/dom.js';
import { openFxEdit } from './settings.js';
import { convertFxToLayer } from './convert.js';
import { pasteTargets, getFxClip, setFxClip, ownerOf, selectedEffects } from './shared.js';

let ref = null; // { target, eff } — по какой строке открыто меню
const refresh = () => { bus.emitDoc(); };

export function deleteFx() { const list = selectedEffects(); if (!list.length) return; snapshot();
  const top = list[list.length - 1], o0 = ownerOf(top); // что выбрать после: эффект НАД верхним удаляемым
  const above = o0 ? o0.effects[o0.effects.indexOf(top) + 1] : null;
  for (const e of list) { const o = ownerOf(e); if (o) { const i = o.effects.indexOf(e); if (i >= 0) o.effects.splice(i, 1); } }
  if (above && ownerOf(above)) { S.fxSel = new Set([above]); S.fxCur = above; } // эффект над удалённым становится активным
  else { S.fxSel.clear(); S.fxCur = null; const oi = o0 ? S.layers.indexOf(o0) : -1; // нет эффекта выше → активным становится владелец (слой/папка)
    if (oi >= 0) { S.cur = oi; S.selFolder = null; } else if (o0) S.selFolder = o0.id; }
  refresh(); }

export function duplicateFx() { const list = selectedEffects(); if (!list.length) return; snapshot(); const made = new Set();
  for (const e of list) { const o = ownerOf(e); if (!o) continue; const i = o.effects.indexOf(e); const c = cloneFx([e])[0];
    o.effects.splice(i + 1, 0, c); made.add(c); }
  S.fxSel = made; S.fxCur = [...made][0] || null; refresh(); }

export function copyFx() { const list = selectedEffects(); if (!list.length) return; setFxClip(cloneFx(list)); toast(t('toast.fxCopied')); }

// Copy Effect — один эффект (по строке меню); Copy Effects — все эффекты слоя/папки
export function copyOneFx(eff) { if (!eff) return; setFxClip(cloneFx([eff])); toast(t('toast.fxCopied')); }
export function copyEffectsOf(target) { const list = (target && target.effects) || [];
  if (!list.length) { toast(t('toast.noFxToCopy')); return; } setFxClip(cloneFx(list)); toast(t('toast.fxCopied')); }

export const hasFxClipboard = () => getFxClip().length > 0;

export function pasteFx() { const clip = getFxClip(); if (!clip.length) { toast(t('toast.noFxClipboard')); return; }
  const targets = pasteTargets(); if (!targets.length) return; snapshot();
  for (const tg of targets) tg.effects.push(...cloneFx(clip)); refresh(); toast(t('toast.fxPasted')); }

export function openFxMenu(x, y, target, eff) {
  ref = { target, eff };
  $('fxctx-aslayer').style.display = eff && eff.type === 'adjustment' ? 'none' : '';
  showMenuBeside($('fxctx'), $('lay-pop'), y);
}

export function mountClipboard() {
  const close = () => $('fxctx').classList.remove('on');
  $('fxctx-edit').onclick = () => { close(); if (ref) openFxEdit(ref.target, ref.eff); };
  $('fxctx-aslayer').onclick = () => { close(); if (ref) convertFxToLayer(ref.target, ref.eff); };
  $('fxctx-copy').onclick = () => { close(); if (ref) copyOneFx(ref.eff); };
  $('fxctx-dup').onclick = () => { close(); duplicateFx(); };
  $('fxctx-del').onclick = () => { close(); deleteFx(); };
}
