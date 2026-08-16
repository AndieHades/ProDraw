// Настройки приложения: тема (тумблер), язык и жест Brush Size Modifier
// (Hot Key / чувствительность / направление). Шестерёнка в галерее.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { $, showMenuAt } from '../core/dom.js';
import { t, getLocale, locales, setLocale } from '../i18n/index.js';
import { toggleTheme, getTheme } from '../styles/theme.js';
import { SENS_PRESETS } from '../config/brush-resize.js';

const SENS_LABELS = ['brsz.low', 'brsz.medium', 'brsz.high'];
const sensLabel = () => { const i = SENS_PRESETS.indexOf(S.brushResize.sensitivity); return t(SENS_LABELS[i < 0 ? 1 : i]); };

// строка «подпись → значение», клик запускает действие и перерисовывает меню
function valRow(m, labelKey, value, action) { const row = document.createElement('div'); row.className = 'set-row';
  const l = document.createElement('span'); l.textContent = t(labelKey);
  const v = document.createElement('span'); v.className = 'set-val'; v.textContent = value;
  row.append(l, v); row.onclick = () => { actions.run(action); build(); }; m.appendChild(row); }

function build() { const m = $('setmenu'); m.innerHTML = '';
  const head = document.createElement('div'); head.className = 'cctx-head'; head.textContent = t('ui.settings'); m.appendChild(head);

  const themeRow = document.createElement('div'); themeRow.className = 'set-row';
  const tl = document.createElement('span'); tl.textContent = t('ui.lightTheme');
  const sw = document.createElement('span'); sw.className = 'switch';
  const inp = document.createElement('input'); inp.type = 'checkbox'; inp.checked = getTheme() === 'light';
  sw.append(inp, document.createElement('span'));
  themeRow.append(tl, sw);
  themeRow.onclick = () => { toggleTheme(); inp.checked = getTheme() === 'light'; };
  m.appendChild(themeRow);

  const langRow = document.createElement('div'); langRow.className = 'set-row';
  const ll = document.createElement('span'); ll.textContent = t('ui.language');
  const lv = document.createElement('span'); lv.className = 'set-val'; lv.textContent = getLocale().toUpperCase();
  langRow.append(ll, lv);
  langRow.onclick = () => { const ls = locales(); setLocale(ls[(ls.indexOf(getLocale()) + 1) % ls.length]); $('setmenu').classList.remove('on'); };
  m.appendChild(langRow);

  const R = S.brushResize;
  valRow(m, 'cursor.mode', t('cursor.' + S.cursorMode), 'cursor.cycleMode');
  valRow(m, 'eye.key', S.eyedrop.capturing ? t('brsz.press') : S.eyedrop.key.toUpperCase(), 'eyedropper.capture');
  valRow(m, 'brsz.key', R.capturing ? t('brsz.press') : R.key.toUpperCase(), 'brushResize.capture');
  valRow(m, 'brsz.dir', t('brsz.' + R.direction), 'brushResize.cycleDir');
  valRow(m, 'brsz.sens', sensLabel(), 'brushResize.cycleSens');
}

function openSettings() { build(); const r = $('gal-settings').getBoundingClientRect(); showMenuAt($('setmenu'), r.left + r.width / 2, r.bottom + 2); }

export function mount() { $('gal-settings').onclick = openSettings;
  const refresh = () => { if ($('setmenu').classList.contains('on')) build(); }; // захват клавиши/смена настроек — обновляем открытое меню
  bus.on('brushResize', refresh); bus.on('eyedropper', refresh); }
