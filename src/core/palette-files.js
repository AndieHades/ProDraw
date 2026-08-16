import { makeCanvas } from './canvas.js';
import { deleteAppFile, readAppFiles, writeAppFile } from './app-folders.js';
import { exactPaletteFromRgba, sourcePaletteFromSamples, samplesFromRgba } from '../logic/quantize.js';

const CELL = 32, LIMIT = 128;

const cleanName = (path) => (path.split('/').pop() || 'Palette').replace(/\.[^.]+$/, '').slice(0, 40);
const color = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
export const paletteFileName = (name) => (cleanName(name) || 'palette') + '.png';
export const isPaletteImageFile = (f) => f && (((f.type || '').startsWith('image/')) || /\.(png|jpe?g|gif|webp|bmp|avif)$/i.test(f.name || ''));

function paletteFromData(data, limit = LIMIT) {
  const exact = exactPaletteFromRgba(data, limit);
  if (!exact.overflow) return exact.colors.slice(0, limit);
  const samples = samplesFromRgba(data);
  return samples.length ? sourcePaletteFromSamples(samples, limit) : [];
}

function imagePalette(url) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => {
      const c = makeCanvas(im.naturalWidth || im.width, im.naturalHeight || im.height);
      const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(im, 0, 0);
      res(paletteFromData(x.getImageData(0, 0, c.width, c.height).data));
    };
    im.onerror = rej; im.src = url;
  });
}

export function filePalette(file) {
  const url = URL.createObjectURL(file);
  return imagePalette(url).finally(() => URL.revokeObjectURL(url));
}

async function bundledPaletteUrls() {
  try { return (await import('./palette-folder-glob.js')).FOLDER_PALETTE_URLS || {}; } catch (e) { return {}; }
}

export async function folderPalettes() {
  const out = [];
  for (const [path, url] of Object.entries(await bundledPaletteUrls())) {
    try { const colors = await imagePalette(url); if (colors.length) out.push({ name: cleanName(path), colors, folder: true, removable: false }); } catch (e) {}
  }
  return out;
}

export async function runtimeFolderPalettes() {
  const out = []; let files = [];
  try { files = await readAppFiles('palettes', isPaletteImageFile); } catch (e) {}
  for (const f of files) {
    try { const colors = await filePalette(f); if (colors.length) out.push({ name: cleanName(f.name), colors, folder: true, removable: true, fileName: f.name }); } catch (e) {}
  }
  return out;
}

export function mergeFolderPalettes(bundled, runtime) {
  const out = new Map();
  for (const p of [...bundled, ...runtime]) {
    const k = p.name.toLowerCase(), old = out.get(k);
    if (!old || (!old.removable && p.removable)) out.set(k, p);
  }
  return [...out.values()];
}

export async function allFolderPalettes() {
  return mergeFolderPalettes(await folderPalettes(), await runtimeFolderPalettes());
}

export function paletteImageCanvas(colors, cell = CELL) {
  const c = makeCanvas(Math.max(1, colors.length) * cell, cell), x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  colors.forEach((col, i) => { x.fillStyle = color(col); x.fillRect(i * cell, 0, cell, cell); });
  return c;
}

export function paletteImageBlob(colors) {
  return new Promise((res) => paletteImageCanvas(colors).toBlob((b) => res(b), 'image/png'));
}

export async function savePaletteToFolder(name, colors) {
  const blob = await paletteImageBlob(colors);
  return writeAppFile('palettes', paletteFileName(name), blob);
}

export const deletePaletteFromFolder = (name) => deleteAppFile('palettes', name && /\.[^.]+$/.test(name) ? name : paletteFileName(name));
