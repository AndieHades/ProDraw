// Окно настроек эффекта: живое превью на холсте, затем Применить/Отмена.
// Новый эффект живёт черновиком до Apply; строка в списке появляется после фиксации.
import { S, newEffect } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { snapshot, addUndoGuard } from '../../core/history.js';
import { expandForEffects } from '../../core/document.js';
import { $, t } from '../../core/dom.js';
import { EFFECT_FIELDS } from '../../config/defaults.js';
import { rgbToHex } from '../../logic/color.js';
import { activeTarget } from './shared.js';

let ses = null; // { target, eff, isNew, original }
let undoGuardBound = false;

function showRows(type) { const f = new Set(EFFECT_FIELDS[type]), win = $('fx-edit');
  win.querySelector('.fxf-size').style.display = f.has('size') ? '' : 'none';
  win.querySelector('.fxf-intensity').style.display = f.has('intensity') ? '' : 'none';
  win.querySelector('.fxf-color').style.display = f.has('color') ? '' : 'none';
  for (const r of win.querySelectorAll('.fxf-offset')) r.style.display = f.has('offset') ? '' : 'none'; }

function fill(eff) { const p = eff.params; showRows(eff.type); $('fx-edit-title').textContent = t('fx.' + eff.type);
  if (p.size != null) { $('fx-size').value = p.size; $('fx-sizev').textContent = p.size; }
  if (p.intensity != null) { const v = Math.round(p.intensity * 100); $('fx-int').value = v; $('fx-intv').textContent = v + '%'; }
  if (p.dx != null) { $('fx-dx').value = p.dx; $('fx-dxv').textContent = p.dx; }
  if (p.dy != null) { $('fx-dy').value = p.dy; $('fx-dyv').textContent = p.dy; }
  $('fx-colsw').style.background = p.color; }

function readForm() { if (!ses) return; const p = ses.eff.params;
  if (p.size != null) p.size = +$('fx-size').value;
  if (p.intensity != null) p.intensity = +$('fx-int').value / 100;
  if (p.dx != null) p.dx = +$('fx-dx').value;
  if (p.dy != null) p.dy = +$('fx-dy').value;
  bus.emit('render'); }

// цвет выбирается нашим HSV-пикером (никаких системных input[type=color])
function setColor(hex) { if (!ses) return; ses.eff.params.color = hex; $('fx-colsw').style.background = hex; bus.emit('render'); }

function revert() { if (!ses) return;
  if (ses.isNew) S.fxDraft = null; else ses.eff.params = { ...ses.original }; }

const close = () => { if (ses && ses.isNew) S.fxDraft = null; $('fx-edit').classList.remove('on'); $('colpop').classList.remove('on'); ses = null; };

function open(target, eff, isNew) { if (ses) { revert(); close(); } // переключение окна — тихо отменить прежнее
  if (isNew) S.fxDraft = { target, eff };
  ses = { target, eff, isNew, original: { ...eff.params } }; fill(eff); $('fx-edit').classList.add('on');
  bus.emitDoc(); }

const newFxParams = (type) => (EFFECT_FIELDS[type]?.includes('color') ? { color: rgbToHex(S.active) } : {});

export function openFxNew(type) { const target = activeTarget(); if (!target) return;
  const eff = newEffect(type, newFxParams(type)); open(target, eff, true); }
export function openFxEdit(target, eff) {
  if (!target || !eff) return;
  if (eff.type === 'adjustment') { actions.run('effect.bc.edit', target, eff); return; }
  open(target, eff, false);
}

export function fxCancel() { if (!ses) return; revert(); close(); bus.emitDoc(); }
export function fxApply() { if (!ses) return; const { target, eff, isNew, original } = ses;
  if (isNew) { snapshot(); target.effects.push(eff); S.fxDraft = null; }
  else { const cur = { ...eff.params }; eff.params = { ...original }; snapshot(); eff.params = cur; }
  expandForEffects(target); // если эффекту не хватает места — раздвинуть холст под тем же снимком
  close(); bus.emitDoc(); }

const syncLabels = () => { $('fx-sizev').textContent = $('fx-size').value; $('fx-intv').textContent = $('fx-int').value + '%';
  $('fx-dxv').textContent = $('fx-dx').value; $('fx-dyv').textContent = $('fx-dy').value; };

export function mountSettings() {
  for (const id of ['fx-size', 'fx-int', 'fx-dx', 'fx-dy']) $(id).addEventListener('input', () => { syncLabels(); readForm(); });
  $('fx-colsw').onclick = () => { if (ses) actions.run('color.for', ses.eff.params.color, setColor); }; // наш пикер, не системный
  $('fx-apply').onclick = fxApply; $('fx-cancel').onclick = fxCancel;
  $('fx-edit').querySelector('.win-x').onclick = fxCancel; // крестик = отмена (откат черновика)
  if (!undoGuardBound) { undoGuardBound = true;
    addUndoGuard(() => { if (!ses) return false; fxCancel(); return true; }); } }
