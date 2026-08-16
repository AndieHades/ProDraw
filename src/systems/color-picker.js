// HSV-пикер в углу: тап по кружку — открыть, перетащить на холст — залить
// активным цветом. Активный цвет хранится в S; смену разносит событие 'palette'.
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';
import * as actions from '../core/actions.js';
import { $, t, toast, copyText } from '../core/dom.js';
import { rgb, rgbToHex, rgbToHsv, hsvToRgb, hexToRgb } from '../logic/color.js';
import { initColorHistory, rememberUsedColor, clearColorHistory } from './color-history.js';
import { DISC_INNER_RATIO, DISC_GAP, discBox, svDiscBox } from './color-disc.js';

let colH = 0, colS = 0, colV = 100, replaceFrom = null; // replaceFrom — цвет или список цветов для режима замены
let onPick = null; // режим «выбрать цвет для произвольной цели» (эффекты): колбэк(hex) на каждое изменение
let prevColor = S.active.slice(0, 3);

const currentColor = () => hsvToRgb(colH, colS, colV);

function addCurrentToPalette() {
  actions.run('palette.addRgb', hsvToRgb(colH, colS, colV));
}

function syncModeActions() {
  const btn = $('col-commit'); if (!btn) return; const active = !!(onPick || replaceFrom);
  btn.classList.toggle('hide', !active); btn.dataset.i18nTitle = onPick ? 'btn.done' : 'btn.replaceColor';
  btn.title = t(btn.dataset.i18nTitle);
}

function focusHex() { $('col-hex').focus(); $('col-hex').select(); }

function afterLayout(fn) {
  const view = document.defaultView;
  const raf = view && view.requestAnimationFrame ? view.requestAnimationFrame.bind(view) : (cb) => setTimeout(cb, 0);
  raf(fn);
}

function showColPop() {
  $('colpop').classList.add('on');
  afterLayout(syncColUI);
}

function syncColUI() { const hex = rgbToHex(hsvToRgb(colH, colS, colV)).toUpperCase();
  $('col-h').value = Math.round(colH); $('col-hv').textContent = Math.round(colH);
  $('col-s').value = Math.round(colS); $('col-sv').textContent = Math.round(colS);
  $('col-v').value = Math.round(colV); $('col-vv').textContent = Math.round(colV);
  const prevHex = rgbToHex(prevColor).toUpperCase();
  $('col-prev-sw').style.background = prevHex; $('col-prev-sw').title = prevHex;
  $('col-sw').style.background = hex; $('col-sw').title = hex; if (document.activeElement !== $('col-hex')) $('col-hex').value = hex;
  const hueHex = rgbToHex(hsvToRgb(colH, 100, 100)); $('col-disc').style.setProperty('--col-hue', hueHex);
  const disc = discBox(), r = Math.min(disc.width, disc.height) / 2, hueInner = Math.min(r, r * DISC_INNER_RATIO + DISC_GAP), ringR = (r + hueInner) / 2, a = (colH - 90) * Math.PI / 180;
  $('col-hmark').style.left = (r + Math.cos(a) * ringR) + 'px'; $('col-hmark').style.top = (r + Math.sin(a) * ringR) + 'px'; $('col-hmark').style.background = hueHex;
  const sv = svDiscBox(disc), svD = Math.min(sv.width, sv.height), svR = svD / 2;
  let sx = sv.left + svD * colS / 100, sy = sv.top + svD * (100 - colV) / 100;
  const scx = sv.left + svR, scy = sv.top + svR, sd = Math.hypot(sx - scx, sy - scy);
  if (sd > svR) { sx = scx + (sx - scx) / sd * svR; sy = scy + (sy - scy) / sd * svR; }
  $('col-svmark').style.left = sx + 'px'; $('col-svmark').style.top = sy + 'px'; $('col-svmark').style.background = hex;
  $('col-svmark').classList.toggle('white', colS < 8 && colV > 92);
  $('col-s').style.background = 'linear-gradient(90deg,' + rgbToHex(hsvToRgb(colH, 0, colV)) + ',' + rgbToHex(hsvToRgb(colH, 100, colV)) + ')';
  $('col-v').style.background = 'linear-gradient(90deg,#000,' + rgbToHex(hsvToRgb(colH, colS, 100)) + ')'; }

function colApply() { if (onPick) { onPick(rgbToHex(hsvToRgb(colH, colS, colV))); return; } // отдаём цвет цели (эффекту), активный не трогаем
  if (replaceFrom) return; // в режиме замены активный цвет не трогаем — только превью в col-sw
  S.active = hsvToRgb(colH, colS, colV); bus.emit('palette'); bus.emit('render'); }

function setColorFromRgb(c) { const [h, s, v] = rgbToHsv(c[0], c[1], c[2]); colH = h; colS = s; colV = v; syncColUI(); colApply(); }
function setColorFromHsv(h, s, v) { colH = h; colS = s; colV = v; syncColUI(); colApply(); }

export function syncColFromActive(keepPrevious = false) { if (!keepPrevious) prevColor = S.active.slice(0, 3);
  const [h, s, v] = rgbToHsv(S.active[0], S.active[1], S.active[2]); colH = h; colS = s; colV = v; syncColUI(); }

// кружок цвета открывает СРАЗУ пикер и палитру (это два отдельных перетаскиваемых
// окна — можно растащить); повторный тап при обоих открытых — прячет оба.
function openColPop() { const pb = $('palbar'), cp = $('colpop');
  if (!pb.classList.contains('closed') && cp.classList.contains('on')) { pb.classList.add('closed'); cp.classList.remove('on'); onPick = null; return; }
  pb.classList.remove('closed'); replaceFrom = null; onPick = null; syncModeActions(); $('fx-edit').classList.remove('on'); showColPop(); syncColFromActive(); }

// открыть наш пикер для выбора нового цвета в палитру (вместо нативного input)
export function openColPick() { replaceFrom = null; onPick = null; syncModeActions(); $('fx-edit').classList.remove('on'); showColPop(); syncColFromActive(); }

// открыть наш пикер в режиме «заменить цвет from на выбранный по всему рисунку»
export function openColReplace(from) { replaceFrom = null; onPick = null; replaceFrom = from.slice(); $('fx-edit').classList.remove('on');
  const seed = Array.isArray(from[0]) ? S.active : from;
  const [h, s, v] = rgbToHsv(seed[0], seed[1], seed[2]); colH = h; colS = s; colV = v; showColPop(); syncColUI(); syncModeActions(); }

// открыть наш пикер для произвольной цели (эффекты): cb(hex) на каждое изменение; окно эффекта не прячем
export function openColFor(hex, cb) { replaceFrom = null; onPick = cb || null;
  const [h, s, v] = rgbToHsv(...hexToRgb(hex)); colH = h; colS = s; colV = v; showColPop(); syncColUI(); syncModeActions(); }

export function mount() {
  initColorHistory((c) => { prevColor = currentColor(); setColorFromRgb(c); }); syncModeActions();
  let drop = null;
  $('activewrap').addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse' && e.button !== 0) return;
    drop = { x: e.clientX, y: e.clientY, moved: false }; try { $('activewrap').setPointerCapture(e.pointerId); } catch (err) {} });
  $('activewrap').addEventListener('pointermove', (e) => { if (!drop) return;
    if (!drop.moved && Math.hypot(e.clientX - drop.x, e.clientY - drop.y) > 8) { drop.moved = true; $('swdrop').style.background = rgb(S.active); $('swdrop').classList.add('on'); }
    if (drop.moved) { $('swdrop').style.left = e.clientX + 'px'; $('swdrop').style.top = e.clientY + 'px'; } });
  $('activewrap').addEventListener('pointerup', (e) => { if (!drop) return; const moved = drop.moved; drop = null; $('swdrop').classList.remove('on');
    if (!moved) { openColPop(); return; }
    if (!actions.run('layer.dropColorAt', S.active, e.clientX, e.clientY)) actions.run('edit.dropColorAt', S.active, e.clientX, e.clientY); });
  $('activewrap').addEventListener('pointercancel', () => { if (drop) { drop = null; $('swdrop').classList.remove('on'); } });
  const svPoint = (e) => {
    const disc = discBox(), sv = svDiscBox(disc), svLeft = disc.left + sv.left, svTop = disc.top + sv.top;
    const svCx = svLeft + sv.width / 2, svCy = svTop + sv.height / 2;
    if (Math.hypot(e.clientX - svCx, e.clientY - svCy) > Math.min(sv.width, sv.height) / 2) return null;
    return {
      s: Math.max(0, Math.min(100, (e.clientX - svLeft) / sv.width * 100)),
      v: Math.max(0, Math.min(100, 100 - (e.clientY - svTop) / sv.height * 100)),
      sv,
    };
  };
  const snapSvPoint = (p) => {
    const snaps = [[0, 100], [50, 100], [100, 100], [100, 58], [100, 24], [50, 0], [0, 24], [0, 58]];
    let best = snaps[0], bd = Infinity;
    for (const q of snaps) { const d = (q[0] - p.s) ** 2 + (q[1] - p.v) ** 2; if (d < bd) { bd = d; best = q; } }
    setColorFromHsv(colH, best[0], best[1]);
  };
  const discPick = (e) => {
    const r = discBox(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const dx = e.clientX - cx, dy = e.clientY - cy, d = Math.hypot(dx, dy), outer = Math.min(r.width, r.height) / 2, inner = outer * DISC_INNER_RATIO;
    if (d >= inner + DISC_GAP && d <= outer) { setColorFromHsv((Math.atan2(dy, dx) * 180 / Math.PI + 90 + 360) % 360, colS, colV); return 'hue'; }
    const p = svPoint(e); if (p) { setColorFromHsv(colH, p.s, p.v); return 'sv'; }
    return '';
  };
  let discDrag = false, lastSvTap = null;
  $('col-disc').addEventListener('contextmenu', (e) => e.preventDefault());
  $('col-disc').addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 2) return;
    e.preventDefault();
    if (e.pointerType === 'mouse' && e.button === 2) { if (discPick(e)) addCurrentToPalette(); return; }
    const p = svPoint(e), now = Date.now();
    prevColor = currentColor();
    if (p && lastSvTap && now - lastSvTap.t < 360 && Math.hypot(e.clientX - lastSvTap.x, e.clientY - lastSvTap.y) < 22) {
      snapSvPoint(p); lastSvTap = null; discDrag = false; return;
    }
    const mode = discPick(e); discDrag = !!mode; lastSvTap = mode === 'sv' ? { t: now, x: e.clientX, y: e.clientY } : null;
    if (discDrag) try { $('col-disc').setPointerCapture(e.pointerId); } catch (err) {} });
  $('col-disc').addEventListener('pointermove', (e) => { if (discDrag) discPick(e); });
  $('col-disc').addEventListener('pointerup', () => { discDrag = false; });
  $('col-disc').addEventListener('pointercancel', () => { discDrag = false; });
  for (const id of ['col-h', 'col-s', 'col-v']) $(id).addEventListener('pointerdown', () => { prevColor = currentColor(); });
  $('col-h').addEventListener('input', () => setColorFromHsv(+$('col-h').value, colS, colV));
  $('col-s').addEventListener('input', () => setColorFromHsv(colH, +$('col-s').value, colV));
  $('col-v').addEventListener('input', () => setColorFromHsv(colH, colS, +$('col-v').value));
  $('col-hex').addEventListener('input', () => { const v = $('col-hex').value.trim().replace(/^#/, '');
    if (/^[0-9a-fA-F]{6}$/.test(v)) { prevColor = currentColor(); setColorFromRgb(hexToRgb(v)); } });
  $('col-prev-sw').onclick = () => { const old = currentColor(), prev = prevColor.slice(0, 3); prevColor = old; setColorFromRgb(prev); focusHex(); };
  $('col-sw').onclick = focusHex;
  $('col-copy').onclick = () => { const h = rgbToHex(currentColor()).toUpperCase(); $('col-hex').value = h;
    copyText(h).then(() => toast(t('toast.copied', { s: h }))); };
  $('col-add').onclick = addCurrentToPalette;
  $('col-commit').onclick = () => { const c = hsvToRgb(colH, colS, colV);
    if (onPick) { onPick = null; syncModeActions(); $('colpop').classList.remove('on'); return; } // «Готово» — закрыть пикер эффекта
    if (replaceFrom) { const from = replaceFrom; replaceFrom = null; syncModeActions(); $('colpop').classList.remove('on'); actions.run('recolor.all', from, c); } };
  $('col-hist-clear').onclick = clearColorHistory;
  bus.on('color-sync', () => { if (!$('colpop').classList.contains('on')) return; // пикер закрыт — нечего синхронизировать
    prevColor = currentColor(); syncColFromActive(true); // активный цвет двигает круг
    if (onPick) onPick(rgbToHex(S.active)); }); // и в режиме цели (эффект/настройка) применяет выбранный цвет к ней
  $('colpop').querySelector('.win-x').onclick = () => { onPick = null; $('colpop').classList.remove('on'); syncModeActions(); };
}

actions.register('color.pick', openColPick);     // выбрать новый цвет в палитру (вместо нативного input)
actions.register('color.replace', openColReplace); // заменить цвет по всему рисунку нашим пикером
actions.register('color.for', openColFor);        // выбрать цвет для произвольной цели (эффекты) нашим пикером
actions.register('color.used', rememberUsedColor); // история панели Color: только реально использованные на холсте цвета
