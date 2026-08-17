// Персистентность документов в IndexedDB (для галереи). Запись хранит слои,
// палитру, превью-PNG и метаданные; структурный клон умеет в массивы и Map.
const DB = 'pixelheart', STORE = 'docs', VER = 1;
let dbp = null;

function openDb() { if (dbp) return dbp;
  let pending;
  pending = new Promise((res, rej) => { const r = indexedDB.open(DB, VER); let settled = false;
    const release = () => { if (dbp === pending) dbp = null; };
    const fail = (error) => { if (settled) return; settled = true; release(); rej(error); };
    r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' }); };
    r.onsuccess = () => { const db = r.result; if (settled) { db.close(); return; } settled = true;
      db.onversionchange = () => { db.close(); release(); };
      db.onclose = release; res(db); };
    r.onerror = () => fail(r.error);
    r.onblocked = () => fail(new Error('IndexedDB open blocked')); });
  dbp = pending; return pending; }

async function run(mode, fn, retry = true) { const active = openDb(), db = await active;
  try { return await new Promise((res, rej) => {
    const tx = db.transaction(STORE, mode), req = fn(tx.objectStore(STORE)); let result;
    req.onsuccess = () => { result = req.result; };
    tx.oncomplete = () => res(result);
    tx.onerror = () => rej(tx.error || req.error);
    tx.onabort = () => rej(tx.error || req.error || new Error('IndexedDB transaction aborted')); });
  } catch (error) {
    if (!retry || !['InvalidStateError', 'TransactionInactiveError'].includes(error?.name)) throw error;
    try { db.close(); } catch (closeError) {}
    if (dbp === active) dbp = null; return run(mode, fn, false);
  } }

export const saveDoc = (rec) => run('readwrite', (s) => s.put(rec));
export const getDoc = (id) => run('readonly', (s) => s.get(id));
export const listDocs = () => run('readonly', (s) => s.getAll()).then((a) => a || []);
export const removeDoc = (id) => run('readwrite', (s) => s.delete(id));
