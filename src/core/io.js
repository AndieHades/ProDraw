// Сохранение файла на устройство: системный диалог → share → (на тач — оверлей
// с картинкой) → скачивание. Низкоуровневый сервис; что и как назвать — решают
// системы экспорта.
import { $, toast, t } from './dom.js';
import { paintCanvas } from './canvas.js';

// фрагмент сетки [x0,y0,w×h] → canvas с попиксельной альфой
export function gridToCanvas(grid, x0, y0, w, h) {
  return paintCanvas(w, h, (d) => {
    for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) { const cc = grid[y0 + y][x0 + xx]; if (!cc) continue;
      const o = (y * w + xx) * 4; d[o] = cc[0]; d[o + 1] = cc[1]; d[o + 2] = cc[2]; d[o + 3] = cc.length > 3 ? cc[3] : 255; } });
}

export function showSaveOverlay(u) { $('ovlimg').src = u; $('ovl').classList.add('on'); }

export async function saveFile(b, name, mime, desc, overlayUrl = null) {
  if (window.showSaveFilePicker && !matchMedia('(pointer: coarse)').matches) {
    try { const ext = '.' + name.split('.').pop();
      const h = await showSaveFilePicker({ suggestedName: name, types: [{ description: desc, accept: { [mime]: [ext] } }] });
      const w = await h.createWritable(); await w.write(b); await w.close(); toast(t('toast.savedAs', { name: h.name })); return; }
    catch (e) { if (e && e.name === 'AbortError') return; } }
  const file = new File([b], name, { type: mime });
  if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file] }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  if (overlayUrl) { showSaveOverlay(overlayUrl); return; }
  const url = URL.createObjectURL(b), a = document.createElement('a'); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function saveCanvas(c, name) {
  c.toBlob((b) => saveFile(b, name, 'image/png', t('file.pngDesc'),
    matchMedia('(pointer: coarse)').matches ? c.toDataURL('image/png') : null), 'image/png');
}
