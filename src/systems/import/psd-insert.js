// Вставка PSD в текущий документ верхней папкой: порядок слоёв, видимость,
// вложенные группы и поддерживаемые эффекты (best-effort). Холст не меняется —
// то, что не влезло, уходит в ext (Trim покажет). Старые проекты не создаём.
import { S, newLayer, newEffect, blank } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { snapshot } from '../../core/history.js';
import { dirtyAll } from '../../core/layer-cache.js';
import { toast, t } from '../../core/dom.js';

function nextFid() { const max = S.folders.reduce((m, f) => Math.max(m, f.id), 0); S.folderSeq = Math.max(S.folderSeq, max) + 1; return S.folderSeq; }
const mkFolder = (parent, name) => ({ id: nextFid(), name: name || '', open: true, visible: true, symLock: false, parent, effects: [] });

// PSD-сетка (PSD-размер) → grid текущего холста + ext со смещением (ox,oy)
function remap(psdGrid, ox, oy) { const grid = blank(S.W, S.H), ext = new Map();
  for (let y = 0; y < psdGrid.length; y++) { const row = psdGrid[y]; for (let x = 0; x < row.length; x++) { const c = row[x]; if (!c) continue;
    const px = x + ox, py = y + oy; if (px >= 0 && py >= 0 && px < S.W && py < S.H) grid[py][px] = c.slice(); else ext.set(px + ',' + py, c.slice()); } }
  return { grid, ext }; }

function mkEffects(list) { const out = []; for (const e of (list || [])) { const fx = newEffect(e.type);
  for (const k in e.params) if (k in fx.params) fx.params[k] = e.params[k]; out.push(fx); } return out; }

export function insertPsd(psd, name) {
  const ox = (S.W - psd.W) >> 1, oy = (S.H - psd.H) >> 1;
  const top = mkFolder(null, name || 'PSD'); const folders = [top], layers = [], stack = [top], warnings = [];
  for (const r of psd.layers) { // PSD-порядок снизу вверх — совпадает с порядком массива слоёв
    if (r.section === 3) { const f = mkFolder(stack[stack.length - 1].id); folders.push(f); stack.push(f); continue; } // нижняя граница группы
    if (r.section === 1 || r.section === 2) { const f = stack.length > 1 ? stack.pop() : null; // заголовок группы (имя/видимость)
      if (f) { f.name = r.name || (t('folder.name') + ' ' + f.id); f.open = r.section === 1; f.visible = r.visible !== false; } continue; }
    const { grid, ext } = remap(r.grid, ox, oy);
    const L = newLayer(r.name || t('layer.name'), S.W, S.H); L.grid = grid; L.ext = ext; L.fid = stack[stack.length - 1].id;
    L.visible = r.visible !== false; L.effects = mkEffects(r.effects);
    if (r.warnings && r.warnings.length) warnings.push(...r.warnings);
    layers.push(L);
  }
  if (!layers.length) { toast(t('toast.imgOpenFail')); return; }
  snapshot();
  S.folders.push(...folders); S.layers.push(...layers); // папка PSD — верхним элементом списка
  S.cur = S.layers.length - 1; S.marked.clear(); S.selFolder = null;
  dirtyAll(); bus.emitDoc(); bus.emit('fit');
  if (warnings.length) { console.warn('PSD: unsupported effects/issues:', [...new Set(warnings)]); toast(t('toast.psdSomeFx')); }
  else toast(t('toast.psdImported', { n: layers.length }));
}
