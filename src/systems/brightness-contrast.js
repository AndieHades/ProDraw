// Image adjustments. Canvas scope is destructive with live backup; layer/folder
// scope is a non-destructive editable effect row (`adjustment`).
import { S, newEffect } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { snapshot, cloneGrid, addUndoGuard } from '../core/history.js';
import { dirtyAll } from '../core/layer-cache.js';
import { $, t } from '../core/dom.js';
import { adjustColor, adjustmentParams } from '../logic/adjustment.js';
import { activeTarget } from './effects/shared.js';

let bcBackup = null;
let bcSession = null; // { target, eff, isNew, original }
let undoGuardBound = false;
let bcScope = 'layer';
let bcLayerTargets = null;
let bcLockScope = false;

const targetForLayerScope = () => {
  const target = bcLayerTargets && bcLayerTargets[0] ? bcLayerTargets[0] : activeTarget();
  return target && target.effects ? target : S.layers[S.cur];
};

function controlsToParams() {
  return adjustmentParams({
    brightness: $('bc-bri').value,
    contrast: $('bc-con').value,
    saturation: $('bc-sat').value,
    hue: $('bc-hue').value,
  });
}

function setControls(p = {}) {
  const v = adjustmentParams(p);
  $('bc-bri').value = v.brightness;
  $('bc-con').value = v.contrast;
  $('bc-sat').value = v.saturation;
  $('bc-hue').value = v.hue;
  syncLabels();
}

function syncLabels() {
  $('bc-briv').textContent = $('bc-bri').value;
  $('bc-conv').textContent = $('bc-con').value;
  $('bc-satv').textContent = $('bc-sat').value;
  $('bc-huev').textContent = $('bc-hue').value;
}

function syncScopeUi() {
  $('bc-title').textContent = t(bcScope === 'canvas' ? 'bc.titleCanvas' : 'fx.adjustment');
  $('bc-scope').style.display = bcLockScope ? 'none' : '';
  for (const b of $('bc-scope').querySelectorAll('button')) b.classList.toggle('on', b.dataset.scope === bcScope);
}

function restoreCanvas() {
  if (!bcBackup) return;
  for (const b of bcBackup) { b.L.grid = cloneGrid(b.grid); b.L.ext = new Map(b.ext); }
  bcBackup = null; dirtyAll(); bus.emit('render');
}

function cancelAdjustment() {
  if (!bcSession) return;
  if (bcSession.isNew) S.fxDraft = null;
  else bcSession.eff.params = { ...bcSession.original };
  bcSession = null; bus.emitDoc();
}

function beginCanvas() {
  restoreCanvas(); cancelAdjustment();
  bcBackup = S.layers.map((L) => ({ L, grid: cloneGrid(L.grid), ext: new Map(L.ext) }));
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
    for (const b of bcBackup) { const L = b.L;
      for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) { const c = b.grid[y][x]; L.grid[y][x] = c ? adjustColor(c, params) : null; }
      L.ext = new Map(); for (const [k, c] of b.ext) L.ext.set(k, adjustColor(c, params)); }
    dirtyAll(); bus.emit('render'); return;
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
  setControls(opts.params || (opts.eff && opts.eff.params) || {});
  syncScopeUi();
  $('bcpop').classList.add('on');
  startScope(controlsToParams(), opts.eff ? { target: opts.target || targetForLayerScope(), eff: opts.eff } : null);
}

export function openBcEdit(target, eff) {
  if (!target || !eff || eff.type !== 'adjustment') return;
  openBcPop([target], null, { scope: 'layer', lockScope: true, target, eff, params: eff.params });
}

export function bcApply() {
  if (bcScope === 'canvas') {
    if (!bcBackup) return;
    const params = controlsToParams(), backup = bcBackup;
    restoreCanvas(); snapshot(); bcBackup = backup; setControls(params); bcPreview();
    bcBackup = null; bcLayerTargets = null; bcLockScope = false; $('bcpop').classList.remove('on'); bus.emitDoc(); return;
  }
  if (!bcSession) return;
  const { target, eff, isNew, original } = bcSession, cur = adjustmentParams(eff.params);
  if (isNew) { snapshot(); target.effects.push(eff); S.fxDraft = null; }
  else { eff.params = { ...original }; snapshot(); eff.params = cur; }
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
actions.register('effect.bc.edit', openBcEdit);
