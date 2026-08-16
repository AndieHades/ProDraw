// Диспетчер импорта файла кисти → нормализованные записи кончика.
// Запись: { name, source, shape:'shape'|'round', cov|null, grain, params }.
// Procreate (.brush) и Photoshop (.abr, набор кистей).
import { importProcreate } from './procreate.js';
import { importAbr } from './abr.js';

const baseName = (n) => n.replace(/\.[^.]+$/, '');

export async function importBrushFile(file) {
  const buf = await file.arrayBuffer();
  if (/\.brush$/i.test(file.name)) return importProcreate(buf, baseName(file.name));
  if (/\.abr$/i.test(file.name)) { const list = await importAbr(buf);
    return list.map((b, i) => ({ ...b, name: list.length > 1 ? baseName(file.name) + ' ' + (i + 1) : baseName(file.name) })); }
  throw new Error('brush: unsupported format: ' + file.name);
}
