// Единая кнопка Import редактора (рядом с Галереей): меню Photo / File.
// Всё вставляется в ТЕКУЩИЙ документ верхним слоем/папкой; новый холст/проект не
// создаём. Photo/File — прямая вставка в текущий документ.
import * as actions from '../../core/actions.ts';
import { $, toast, t } from '../../core/shell.ts';
import { openMenuAt } from '../../core/menus.ts';
import { insertImageTop } from './index.js';
import { decodePsdFile, isPsdFile } from './psd-file.ts';
import { IMPORT_FILTERS, openDesktopFile } from './desktop-file.ts';
import { psdImportFailure } from './psd-error.ts';
import { isDocumentGenerationToken } from '../../core/session/DocumentSession.ts';

function pick(accept, fn) { const i = document.createElement('input'); i.type = 'file'; i.accept = accept;
  i.onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) fn(f); }; i.click(); }
function loadImg(f, cb) { const im = new Image(); im.onerror = () => toast(t('toast.imgOpenFail')); im.onload = () => cb(im); im.src = URL.createObjectURL(f); }
const baseName = (n) => n.replace(/\.[^.]+$/, '');

const photo = () => pick('image/*', (f) => loadImg(f, (im) => insertImageTop(im, baseName(f.name))));
export async function importPsd(f, sourceLocation = null, progress = null) { const token = actions.run('gallery.beginPsdImport');
  if (!isDocumentGenerationToken(token)) { toast(t('toast.documentOpenFailed')); return false; }
  try { progress?.stage('decoding'); const decoded = await decodePsdFile(f);
    const status = await actions.run('gallery.completePsdImport', token,
      decoded.document, decoded.name, sourceLocation, progress);
    if (status === 'failed') toast(t('toast.documentOpenFailed'));
    return status === 'opened';
  } catch (error) { const failure = psdImportFailure(error);
    toast(t(failure.key, failure.vars)); return false; } }
function file(f0) { const go = async (f, sourceLocation = null) => {
    if (await isPsdFile(f)) await importPsd(f, sourceLocation);
    else loadImg(f, (im) => insertImageTop(im, baseName(f.name))); };
  if (f0) void go(f0); else void openDesktopFile(IMPORT_FILTERS).then((opened) => {
    if (opened !== undefined) return opened && go(opened.file, opened.location);
    pick('image/*,.psd,.psb,image/vnd.adobe.photoshop', go);
  }); }

export function mount() {
  $('imp-btn').addEventListener('click', (e) => { const r = e.currentTarget.getBoundingClientRect(); openMenuAt({ menuId: 'impmenu', x: r.left + r.width / 2, y: r.bottom }); });
  const close = () => $('impmenu').classList.remove('on');
  $('impmenu-photo').onclick = () => { close(); photo(); };
  $('impmenu-file').onclick = () => { close(); file(); };
  actions.register('file.import', () => file());
  actions.register('import.psdFile', importPsd);
}
