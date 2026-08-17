// Image adjustments. Canvas scope is destructive with live backup; layer/folder
// scope is a non-destructive editable effect row (`adjustment`).
import { S, newEffect } from '../core/state.js';
import * as bus from '../core/bus.ts';
import * as actions from '../core/actions.ts';
import { beginPixelBatch, commitPixelPatch,
  snapshot, snapshotEffects, addUndoGuard } from '../core/history.js';
import { captureAdjustmentLayers, writeAdjustmentLayers } from '../core/adjustment-preview.js';
import { $, t } from '../ui/dom/ShellDom.ts';
import { nextFloatingZ } from '../ui/windows/FloatingWindow.ts';
import { adjustmentParams } from '../logic/adjustment.js';
import { activeTarget } from './effects/shared.js';
import { controlsToParams, setControls, syncLabels } from './brightness-contrast/form.js';
import { beginCanvasReference } from './brightness-contrast/reference.js';

let bcBackup = null;
let bcSession = null; // { target, eff, isNew, original }
let undoGuardBound = false;
let bcScope = 'layer';
let bcLayerTargets = null;
let bcLockScope = false;
let bcEffectOnly = false;

const targetForLayerScope = () => {
  const target = bcLayerTargets && bcLayerTargets[0] ? bcLayerTargets[0] : activeTarget();
  return target && target.effects ? target : S.layers[S.cur];
};

function syncScopeUi() {
  $('bc-title').textContent = t(bcScope === 'canvas' ? 'bc.titleCanvas' : 'fx.adjustment');
  $('bc-scope').style.display = bcLockScope ? 'none' : '';
  for (const row of $('bcpop').querySelectorAll('.bc-color-row')) row.style.display = bcEffectOnly ? 'none' : '';
  for (const b of $('bc-scope').querySelectorAll('button')) b.classList.toggle('on', b.dataset.scope === bcScope);
}

function restoreCanvas() {
  if (!bcBackup) return;
  writeAdjustmentLayers(bcBackup); bcBackup = null; bus.emit('render');
}

function cancelAdjustment() {
  if (!bcSession) return;
  if (bcSession.isNew) S.fxDraft = null;
  else bcSession.eff.params = { ...bcSession.original };
  bcSession = null; bus.emitDoc();
}

function beginCanvas() {
  restoreCanvas(); cancelAdjustment();
  bcBackup = captureAdjustmentLayers();
  bcPreview();
}

function beginAdjustment(params = controlsToParams(), edit = null) {
  restoreCanvas(); cancelAdjustment();
  const target = edit ? edit.target : targetForLayerScope(); if (!target || !target.effects) return;
  const eff = edit ? edit.eff : newEffect('adjustment', params);
  if (!edit) S.fxDraft = { target, eff };
  eff.params = { ...eff.params, ...adjustmentParams(params) };
  bcSession = { target, eff, isNew: !edit, original: { ...eff.params } };
  bcPreview();
}

function startScope(params = controlsToParams(), edit = null) {
  syncScopeUi();
  if (bcScope === 'canvas') beginCanvas();
  else beginAdjustment(params, edit);
}

export function bcPreview() {
  const params = controlsToParams();
  if (bcScope === 'canvas') {
    if (!bcBackup) return;
    writeAdjustmentLayers(bcBackup, params); bus.emit('render'); return;
  }
  if (!bcSession) return;
  bcSession.eff.params = { ...bcSession.eff.params, ...params };
  bus.emit('render');
}

export function bcRestore() {
  if (bcScope === 'canvas') restoreCanvas();
  else cancelAdjustment();
}

function switchScope(scope) {
  if (!scope || scope === bcScope || bcLockScope) return;
  const params = controlsToParams();
  restoreCanvas(); cancelAdjustment();
  bcScope = scope; startScope(params);
}

export function openBcPop(targets, title, opts = {}) {
  bcCancel();
  bcLayerTargets = targets && targets.length ? targets.filter((target) => target && target.effects) : [activeTarget()].filter(Boolean);
  bcScope = opts.scope || (targets && targets.length ? 'layer' : 'layer');
  bcLockScope = !!opts.lockScope;
  bcEffectOnly = !!opts.effectOnly;
  setControls(opts.params || (opts.eff && opts.eff.params) || {});
  syncScopeUi();
  $('bcpop').style.zIndex = String(nextFloatingZ()); $('bcpop').classList.add('on');
  startScope(controlsToParams(), opts.eff ? { target: opts.target || targetForLayerScope(), eff: opts.eff } : null);
}

export function openBcEdit(target, eff) {
  if (!target || !eff || eff.type !== 'adjustment') return;
  openBcPop([target], null, { scope: 'layer', lockScope: true,
    effectOnly: true, target, eff, params: eff.params });
}

export function bcApply() {
  if (bcScope === 'canvas') {
    if (!bcBackup) return;
    const params = controlsToParams(), backup = bcBackup;
    restoreCanvas(); const indices = backup.map(({ index }) => index);
    const local = backup.every(({ L }) => L.kind === 'pixel' && !L.ext.size) &&
      beginPixelBatch(indices);
    if (!local && !beginCanvasReference(backup, indices)) snapshot();
    writeAdjustmentLayers(backup, params, local);
    if (local) commitPixelPatch();
    bcBackup = null; bcLayerTargets = null; bcLockScope = false; $('bcpop').classList.remove('on'); bus.emitDoc(); return;
  }
  if (!bcSession) return;
  const { target, eff, isNew, original } = bcSession, cur = adjustmentParams(eff.params);
  if (isNew) { snapshotEffects(target); target.effects.push(eff); S.fxDraft = null; }
  else { eff.params = { ...original }; snapshotEffects(target); eff.params = cur; }
  bcSession = null; bcLayerTargets = null; bcLockScope = false; $('bcpop').classList.remove('on'); bus.emitDoc();
}

export function bcCancel() {
  restoreCanvas(); cancelAdjustment();
  bcLayerTargets = null; bcLockScope = false; $('bcpop').classList.remove('on');
}

export function mount() {
  for (const id of ['bc-bri', 'bc-con', 'bc-sat', 'bc-hue']) $(id).addEventListener('input', () => { syncLabels(); bcPreview(); });
  for (const b of $('bc-scope').querySelectorAll('button')) b.onclick = () => switchScope(b.dataset.scope);
  $('bc-apply').onclick = bcApply; $('bc-cancel').onclick = bcCancel;
  $('bcpop').querySelector('.win-x').onclick = bcCancel;
  if (!undoGuardBound) { undoGuardBound = true;
    addUndoGuard(() => { if (!bcBackup && !bcSession) return false; bcCancel(); return true; }); }
}

actions.register('effect.bc', (targets, title, opts) => openBcPop(targets && targets.length ? targets : null, title, opts));
actions.register('effect.bc.cancel', bcCancel);
actions.register('effect.bc.edit', openBcEdit);
