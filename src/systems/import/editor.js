// Единая кнопка Import редактора (рядом с Галереей): меню Photo / File / Pixelize.
// Всё вставляется в ТЕКУЩИЙ документ верхним слоем/папкой; новый холст/проект не
// создаём. Photo/File — прямая вставка, Pixelize — открыть конвертер.
import * as actions from '../../core/actions.ts';
import { $, showMenuAt, toast, t } from '../../ui/dom/ShellDom.ts';
import { insertImageTop } from './index.js';
import { decodePsdFile, isPsdFile } from './psd-file.ts';
import { IMPORT_FILTERS, openDesktopFile } from './desktop-file.js';

function pick(accept, fn) { const i = document.createElement('input'); i.type = 'file'; i.accept = accept;
  i.onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) fn(f); }; i.click(); }
function loadImg(f, cb) { const im = new Image(); im.onerror = () => toast(t('toast.imgOpenFail')); im.onload = () => cb(im); im.src = URL.createObjectURL(f); }
const baseName = (n) => n.replace(/\.[^.]+$/, '');

const photo = () => pick('image/*', (f) => loadImg(f, (im) => insertImageTop(im, baseName(f.name))));
const pixelize = () => pick('image/*', (f) => actions.run('import.openFile', f)); // конвертер как новый проект
export async function importPsd(f, sourceLocation = null) { const token = actions.run('gallery.beginPsdImport');
  if (!Number.isInteger(token)) { toast(t('toast.documentOpenFailed')); return false; }
  try { const decoded = await decodePsdFile(f);
    const status = await actions.run('gallery.completePsdImport', token,
      decoded.document, decoded.name, sourceLocation);
    if (status === 'failed') toast(t('toast.documentOpenFailed'));
    return status === 'opened';
  } catch (error) { toast(t('toast.documentOpenFailed')); return false; } }
function file(f0) { const go = async (f, sourceLocation = null) => {
    if (await isPsdFile(f)) await importPsd(f, sourceLocation);
    else loadImg(f, (im) => insertImageTop(im, baseName(f.name))); };
  if (f0) void go(f0); else void openDesktopFile(IMPORT_FILTERS).then((opened) => {
    if (opened !== undefined) return opened && go(opened.file, opened.location);
    pick('image/*,.psd,.psb,image/vnd.adobe.photoshop', go);
  }); }

export function mount() {
  $('imp-btn').addEventListener('click', (e) => { const r = e.currentTarget.getBoundingClientRect(); showMenuAt($('impmenu'), r.left + r.width / 2, r.bottom); });
  const close = () => $('impmenu').classList.remove('on');
  $('impmenu-photo').onclick = () => { close(); photo(); };
  $('impmenu-file').onclick = () => { close(); file(); };
  $('impmenu-pix').onclick = () => { close(); pixelize(); };
  actions.register('file.import', () => file());
  actions.register('import.psdFile', importPsd);
}
