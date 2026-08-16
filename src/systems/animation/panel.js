import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import * as actions from '../../core/actions.js';
import { $, t } from '../../core/dom.js';
import { floatingWindow } from '../../core/floating-window.js';
import { ensureAnimator, activeTimeline, createFrame, createTimeline, renameTimeline, setTimelineFps, setTimelineMode, switchTimeline } from '../../core/animation.js';
import { renderTimeline } from './timeline.js';
import { exportSpriteSheet } from './export.js';
import { isPlaying, togglePlayback } from './playback.js';

const icon = '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M9 4v16M15 4v16"/><path d="M4 10h16M4 15h16"/></svg>';
const playIcon = () => isPlaying() ? '<svg viewBox="0 0 24 24"><path d="M8 6v12M16 6v12"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10-6.5z" fill="currentColor" stroke="none"/></svg>';

function button(id, key, svg) {
  return `<button id="${id}" data-i18n-title="${key}" title="${t(key)}">${svg}</button>`;
}

function ensureDom() {
  if (!$('animbtn')) {
    const b = document.createElement('button'); b.id = 'animbtn'; b.innerHTML = icon; b.dataset.i18nTitle = 'tool.animation'; b.title = t('tool.animation');
    $('refbtn').after(b);
  }
  if ($('anim-win')) return;
  const win = document.createElement('div'); win.id = 'anim-win';
  win.innerHTML = `
    <div id="anim-head"><span id="anim-title"></span><span>
      ${button('anim-export', 'animation.exportSheet', '<svg viewBox="0 0 24 24"><path d="M12 3v12"/><path d="M8.5 11.5L12 15l3.5-3.5"/><rect x="4.5" y="17" width="15" height="3" rx="1"/></svg>')}
      <button id="anim-x" class="win-x" data-i18n-title="btn.close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
    </span></div>
    <div id="anim-controls">
      ${button('anim-play', 'animation.play', '')}${button('anim-add-frame', 'animation.addFrame', '<svg viewBox="0 0 24 24"><path d="M12 6v12M6 12h12"/></svg>')}
      <select id="anim-timeline"></select>${button('anim-add-tl', 'animation.addTimeline', '<svg viewBox="0 0 24 24"><path d="M12 6v12M6 12h12"/><rect x="4" y="4" width="16" height="16" rx="2"/></svg>')}
      ${button('anim-ren-tl', 'animation.renameTimeline', '<svg viewBox="0 0 24 24"><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17z"/><path d="M13.5 8.5l3 3"/></svg>')}
      <select id="anim-mode"><option value="once"></option><option value="loop"></option><option value="pingpong"></option></select>
      <label><span id="anim-fps-label"></span><input id="anim-fps" type="number" min="1" max="60"></label>
      <label class="switch"><input id="anim-onion" type="checkbox"><span></span></label>
    </div>
    <div id="anim-strip"></div><div id="anim-rsz" data-i18n-title="ui.resizePanel"><svg viewBox="0 0 24 24"><path d="M19 13l-6 6M19 17.5L16.5 20"/></svg></div>`;
  document.body.appendChild(win);
}

function syncTexts() {
  $('anim-title').textContent = t('animation.title'); $('anim-fps-label').textContent = t('animation.fps');
  for (const o of $('anim-mode').options) o.textContent = t('animation.mode.' + o.value);
  $('anim-play').title = t(isPlaying() ? 'animation.pause' : 'animation.play');
}

export function openAnimator(on = true) {
  const anim = ensureAnimator(); anim.open = on;
  $('anim-win').classList.toggle('on', on); $('animbtn').classList.toggle('on', on);
  if (on) renderPanel(); bus.emit('animation'); bus.emit('render');
}

export function renderPanel() {
  if (!$('anim-win')) return;
  const anim = ensureAnimator(), tl = activeTimeline(); syncTexts();
  $('animbtn').classList.toggle('on', !!anim.open); $('anim-win').classList.toggle('on', !!anim.open);
  $('anim-play').innerHTML = playIcon();
  $('anim-fps').value = tl.fps; $('anim-mode').value = tl.mode; $('anim-onion').checked = !!anim.onion.on;
  const sel = $('anim-timeline'); sel.textContent = '';
  anim.timelines.forEach((x) => { const o = document.createElement('option'); o.value = x.id; o.textContent = x.name; sel.appendChild(o); });
  sel.value = anim.activeTimelineId; renderTimeline($('anim-strip'), renderPanel);
}

export function mountPanel() {
  ensureDom();
  $('animbtn').onclick = () => openAnimator(!S.animator?.open);
  $('anim-x').onclick = () => openAnimator(false);
  $('anim-play').onclick = togglePlayback;
  $('anim-add-frame').onclick = () => { createFrame(); renderPanel(); };
  $('anim-export').onclick = exportSpriteSheet;
  $('anim-timeline').onchange = (e) => { switchTimeline(e.target.value); renderPanel(); };
  $('anim-add-tl').onclick = () => { createTimeline(); renderPanel(); };
  $('anim-ren-tl').onclick = () => { const tl = activeTimeline(), v = window.prompt(t('animation.renamePrompt'), tl.name); if (v) renameTimeline(tl.id, v); };
  $('anim-mode').onchange = (e) => setTimelineMode(e.target.value);
  $('anim-fps').onchange = (e) => setTimelineFps(e.target.value);
  $('anim-onion').onchange = (e) => { ensureAnimator().onion.on = e.target.checked; bus.emit('animation'); bus.emit('render'); };
  floatingWindow($('anim-win'), { grip: $('anim-head'), handle: $('anim-rsz'), storeKey: 'animwin', minW: 320, minH: 150 });
  bus.on('animation', renderPanel); bus.on('locale', renderPanel);
  actions.register('ui.animation', () => openAnimator(!S.animator?.open));
}
