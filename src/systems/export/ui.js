// Окно Export: сегментированные группы (chips) для четырёх независимых
// параметров. UI подстраивается под возможности формата (режимы включаются по
// supports*-флагам), отдельные опции показываются только для режима Separate.
import { $ } from '../../core/dom.js';
import { FORMATS, MODE_CAP } from './formats.js';
import { runExport } from './pipeline.js';

// группа кнопок-чипов: клик выбирает значение (data-val), .on — активный
function group(el, onChange) {
  let val = null;
  const set = (v) => { val = v; [...el.querySelectorAll('button')].forEach((b) => b.classList.toggle('on', b.dataset.val === v)); if (onChange) onChange(v); };
  el.querySelectorAll('button').forEach((b) => { b.onclick = () => { if (!b.disabled) set(b.dataset.val); }; });
  return { set, get: () => val, reset: () => set(el.querySelector('button').dataset.val), el };
}

export function mountExportUI() {
  const scope = group($('ex-scope'));
  const format = group($('ex-format'), updateCaps);
  const mode = group($('ex-mode'), updateSep);
  const sepmode = group($('ex-sepmode'));
  const sepbounds = group($('ex-sepbounds'));
  const canvas = group($('ex-canvas'));

  function updateCaps() {
    const f = FORMATS[format.get()];
    mode.el.querySelectorAll('button').forEach((b) => { const ok = !!f[MODE_CAP[b.dataset.val]];
      b.disabled = !ok; b.classList.toggle('disabled', !ok); });
    if (!f[MODE_CAP[mode.get()]]) mode.set('flattened'); else updateSep();
  }
  function updateSep() { $('ex-sep').style.display = mode.get() === 'separate' ? '' : 'none'; }

  [scope, format, mode, sepmode, sepbounds, canvas].forEach((g) => g.reset()); // дефолты + первичная синхронизация

  $('ex-run').onclick = () => {
    runExport({ scope: scope.get(), mode: mode.get(), format: format.get(),
      separateMode: sepmode.get(), boundsMode: sepbounds.get(), canvasBounds: canvas.get(),
      includeHidden: $('ex-hidden-in').checked });
    close();
  };
  $('ex-cancel').onclick = close;
}

export const openExport = () => $('export-ovl').classList.add('on');
const close = () => $('export-ovl').classList.remove('on');
