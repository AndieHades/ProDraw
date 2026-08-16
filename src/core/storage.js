// Персистентность документов в IndexedDB (для галереи). Запись хранит слои,
// палитру, превью-PNG и метаданные; структурный клон умеет в массивы и Map.
const DB = 'pixelheart', STORE = 'docs', VER = 1;
let dbp = null;

function openDb() { if (dbp) return dbp;
  dbp = new Promise((res, rej) => { const r = indexedDB.open(DB, VER);
    r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' }); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  return dbp; }

function run(mode, fn) { return openDb().then((db) => new Promise((res, rej) => {
  const store = db.transaction(STORE, mode).objectStore(STORE), req = fn(store);
  req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); })); }

export const saveDoc = (rec) => run('readwrite', (s) => s.put(rec));
export const getDoc = (id) => run('readonly', (s) => s.get(id));
export const listDocs = () => run('readonly', (s) => s.getAll()).then((a) => a || []);
export const removeDoc = (id) => run('readwrite', (s) => s.delete(id));
