// Персистентность библиотеки кистей в IndexedDB: кисти и наборы (папки).
// Запись кисти хранит маску покрытия/grain/параметры (структурный клон умеет
// в Uint8Array). Активная кисть — в S.stampBrush, тут только хранилище.
const DB = 'pixelheart-brush', VER = 1, STORES = ['brushes', 'sets'];
let dbp = null;

function openDb() { if (dbp) return dbp;
  dbp = new Promise((res, rej) => { const r = indexedDB.open(DB, VER);
    r.onupgradeneeded = () => { const db = r.result; for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' }); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  return dbp; }

function run(store, mode, fn) { return openDb().then((db) => new Promise((res, rej) => {
  const os = db.transaction(store, mode).objectStore(store), req = fn(os);
  req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); })); }

export const saveBrush = (b) => run('brushes', 'readwrite', (s) => s.put(b));
export const listBrushes = () => run('brushes', 'readonly', (s) => s.getAll()).then((a) => a || []);
export const removeBrush = (id) => run('brushes', 'readwrite', (s) => s.delete(id));
export const saveSet = (x) => run('sets', 'readwrite', (s) => s.put(x));
export const listSets = () => run('sets', 'readonly', (s) => s.getAll()).then((a) => a || []);
export const removeSet = (id) => run('sets', 'readwrite', (s) => s.delete(id));
