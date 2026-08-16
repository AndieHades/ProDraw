import { TEXT_FONTS, TEXT_IMPORT } from '../config/text.js';
import { readAppFiles, writeAppFile } from './app-folders.js';

const DB = 'pixelheart-fonts', STORE = 'fonts', VER = 1;
let dbp = null, cache = null;
const FOLDER_FONT_URLS = typeof import.meta.glob === 'function'
  ? import.meta.glob('../app-folders/fonts/*.{ttf,otf,woff,woff2}', { query: '?url', import: 'default', eager: true })
  : {};

const clone = (f) => ({ ...f, data: f.data ? f.data.slice(0) : undefined });
const ext = (name) => (name.split('.').pop() || '').toLowerCase();
const safeName = (name) => name.replace(/\.[^.]+$/, '').trim() || 'Font';
const cssFamily = (id) => 'PixelHeartFont_' + id.replace(/[^a-zA-Z0-9_-]/g, '_');
const isFontFile = (f) => f && TEXT_IMPORT.formats.includes(ext(f.name || '')) && (!f.size || f.size <= TEXT_IMPORT.maxBytes);

function openDb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB, VER);
    r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' }); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  return dbp;
}

async function run(mode, fn) {
  const db = await openDb(); if (!db) return null;
  return new Promise((res, rej) => {
    const st = db.transaction(STORE, mode).objectStore(STORE), req = fn(st);
    req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error);
  });
}

async function imported() {
  const list = (await run('readonly', (s) => s.getAll())) || [];
  return list.map((f, i) => ({ ...f, order: f.order ?? i }));
}

async function folderFonts() {
  const entries = Object.entries(FOLDER_FONT_URLS);
  const out = [];
  for (let i = 0; i < entries.length; i++) {
    const [path, url] = entries[i], name = safeName(path.split('/').pop() || 'Font'), format = ext(path);
    try {
      const data = await fetch(url).then((r) => r.arrayBuffer());
      out.push({ id: 'folder-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name, family: '"' + cssFamily(name) + '"',
        format, builtin: false, folder: true, order: 20 + i, createdAt: 0, updatedAt: 0, data });
    } catch (e) {}
  }
  return out;
}

async function runtimeFolderFonts() {
  const files = await readAppFiles('fonts', isFontFile), out = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i], name = safeName(f.name), order = 40 + i;
    try { out.push({ id: 'runtime-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name, family: '"' + cssFamily(name) + '"',
      format: ext(f.name), builtin: false, folder: true, order, createdAt: 0, updatedAt: 0, data: await f.arrayBuffer() }); } catch (e) {}
  }
  return out;
}

export async function registerFont(f) {
  if (f.builtin || !f.data || typeof FontFace === 'undefined' || !document.fonts) return f;
  try {
    const face = new FontFace(cssFamily(f.id), f.data.slice(0));
    await face.load(); document.fonts.add(face);
    f.family = '"' + cssFamily(f.id) + '"';
  } catch (e) {}
  return f;
}

export async function loadFonts() {
  if (cache) return cache.map(clone);
  const list = [...TEXT_FONTS.map(clone), ...(await folderFonts()), ...(await runtimeFolderFonts()), ...(await imported())]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  await Promise.all(list.map(registerFont));
  cache = list;
  return list.map(clone);
}

export function fontById(id, fonts = cache || TEXT_FONTS) {
  return fonts.find((f) => f.id === id) || fonts[0] || TEXT_FONTS[0];
}

export async function importFontFile(file) {
  const format = ext(file.name);
  if (!TEXT_IMPORT.formats.includes(format) || file.size > TEXT_IMPORT.maxBytes) throw new Error('bad-font');
  const data = await file.arrayBuffer();
  const order = Date.now(), id = 'font-' + order.toString(36);
  const rec = { id, name: safeName(file.name), family: '"' + cssFamily(id) + '"', format, builtin: false, order, createdAt: order, updatedAt: order, data };
  await run('readwrite', (s) => s.put(rec)); cache = null;
  await writeAppFile('fonts', file.name, file);
  await registerFont(rec);
  return rec;
}

export async function renameFont(id, name) {
  const list = await imported(), f = list.find((x) => x.id === id);
  if (!f) return false;
  f.name = safeName(name); f.updatedAt = Date.now();
  await run('readwrite', (s) => s.put(f)); cache = null; return true;
}

export async function deleteFont(id) {
  await run('readwrite', (s) => s.delete(id)); cache = null; return true;
}
