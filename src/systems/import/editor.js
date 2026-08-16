// Единая кнопка Import редактора (рядом с Галереей): меню Photo / File / Pixelize.
// Всё вставляется в ТЕКУЩИЙ документ верхним слоем/папкой; новый холст/проект не
// создаём. Photo/File — прямая вставка, Pixelize — открыть конвертер.
import * as actions from '../../core/actions.js';
import { $, showMenuAt, toast, t } from '../../core/dom.js';
import { readPsd } from '../../logic/psd.js';
import { insertPsd } from './psd-insert.js';
import { insertImageTop } from './index.js';

function pick(accept, fn) { const i = document.createElement('input'); i.type = 'file'; i.accept = accept;
  i.onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) fn(f); }; i.click(); }
function loadImg(f, cb) { const im = new Image(); im.onerror = () => toast(t('toast.imgOpenFail')); im.onload = () => cb(im); im.src = URL.createObjectURL(f); }
const baseName = (n) => n.replace(/\.[^.]+$/, '');

const photo = () => pick('image/*', (f) => loadImg(f, (im) => insertImageTop(im, baseName(f.name))));
const pixelize = () => pick('image/*', (f) => actions.run('import.openFile', f)); // конвертер как новый проект
function file(f0) { const go = (f) => { if (/\.psd$/i.test(f.name) || f.type === 'image/vnd.adobe.photoshop')
    f.arrayBuffer().then((b) => { let psd = null; try { psd = readPsd(b); } catch (e) {} // битый/непрочитанный PSD не должен ронять импорт
      if (psd && psd.layers.length) insertPsd(psd, baseName(f.name)); else toast(t('toast.imgOpenFail')); });
  else loadImg(f, (im) => insertImageTop(im, baseName(f.name))); };
  if (f0) go(f0); else pick('image/*,.psd,image/vnd.adobe.photoshop', go); }

export function mount() {
  $('imp-btn').addEventListener('click', (e) => { const r = e.currentTarget.getBoundingClientRect(); showMenuAt($('impmenu'), r.left + r.width / 2, r.bottom); });
  const close = () => $('impmenu').classList.remove('on');
  $('impmenu-photo').onclick = () => { close(); photo(); };
  $('impmenu-file').onclick = () => { close(); file(); };
  $('impmenu-pix').onclick = () => { close(); pixelize(); };
  actions.register('file.import', () => file());
}
