// Персистентность документов в IndexedDB (для галереи). Запись хранит слои,
// палитру, превью-PNG и метаданные; структурный клон умеет в массивы и Map.
const DB = 'pixelheart', STORE = 'docs', GALLERY_STORE = 'gallery-index', VER = 2;
let dbp = null;

const finite = (value) => Number.isFinite(value) ? value : 0;
function galleryRecord(rec) {
  return { id: rec.id, kind: rec.kind === 'folder' ? 'folder' : 'doc',
    folder: rec.folder ?? null, name: typeof rec.name === 'string' ? rec.name : '',
    W: finite(rec.W), H: finite(rec.H),
    preview: typeof rec.preview === 'string' ? rec.preview : '',
    order: finite(rec.order), updated: finite(rec.updated) };
}

function upgradeDatabase(request) {
  const db = request.result, tx = request.transaction;
  const docs = db.objectStoreNames.contains(STORE)
    ? tx.objectStore(STORE) : db.createObjectStore(STORE, { keyPath: 'id' });
  const gallery = db.objectStoreNames.contains(GALLERY_STORE)
    ? tx.objectStore(GALLERY_STORE) : db.createObjectStore(GALLERY_STORE, { keyPath: 'id' });
  if (request.oldVersion >= 2) return;
  const cursor = docs.openCursor();
  cursor.onsuccess = () => { const item = cursor.result; if (!item) return;
    if (item.value?.id) gallery.put(galleryRecord(item.value)); item.continue(); };
}

function openDb() { if (dbp) return dbp;
  let pending;
  pending = new Promise((res, rej) => { const r = indexedDB.open(DB, VER); let settled = false;
    const release = () => { if (dbp === pending) dbp = null; };
    const fail = (error) => { if (settled) return; settled = true; release(); rej(error); };
    r.onupgradeneeded = () => upgradeDatabase(r);
    r.onsuccess = () => { const db = r.result; if (settled) { db.close(); return; } settled = true;
      db.onversionchange = () => { db.close(); release(); };
      db.onclose = release; res(db); };
    r.onerror = () => fail(r.error);
    r.onblocked = () => fail(new Error('IndexedDB open blocked')); });
  dbp = pending; return pending; }

async function run(mode, stores, fn, retry = true) { const active = openDb(), db = await active;
  try { return await new Promise((res, rej) => {
    const tx = db.transaction(stores, mode), req = fn(tx); let result;
    req?.addEventListener('success', () => { result = req.result; });
    tx.oncomplete = () => res(result);
    tx.onerror = () => rej(tx.error || req?.error);
    tx.onabort = () => rej(tx.error || req?.error || new Error('IndexedDB transaction aborted')); });
  } catch (error) {
    if (!retry || !['InvalidStateError', 'TransactionInactiveError'].includes(error?.name)) throw error;
    try { db.close(); } catch (closeError) {}
    if (dbp === active) dbp = null; return run(mode, stores, fn, false);
  } }

export const saveDoc = (rec) => run('readwrite', [STORE, GALLERY_STORE], (tx) => {
  const request = tx.objectStore(STORE).put(rec);
  tx.objectStore(GALLERY_STORE).put(galleryRecord(rec)); return request; });
export const getDoc = (id) => run('readonly', STORE,
  (tx) => tx.objectStore(STORE).get(id));
export const listDocs = () => run('readonly', STORE,
  (tx) => tx.objectStore(STORE).getAll()).then((a) => a || []);
export const getGalleryDoc = (id) => run('readonly', GALLERY_STORE,
  (tx) => tx.objectStore(GALLERY_STORE).get(id));
export const listGalleryDocs = () => run('readonly', GALLERY_STORE,
  (tx) => tx.objectStore(GALLERY_STORE).getAll()).then((a) => a || []);
export const updateGalleryDoc = (id, fields) => run('readwrite', GALLERY_STORE, (tx) => {
  const store = tx.objectStore(GALLERY_STORE), request = store.get(id);
  request.addEventListener('success', () => { if (request.result)
    store.put({ ...request.result, ...fields, id }); });
  return request;
}).then(Boolean);
export const removeDoc = (id) => run('readwrite', [STORE, GALLERY_STORE], (tx) => {
  const request = tx.objectStore(STORE).delete(id);
  tx.objectStore(GALLERY_STORE).delete(id); return request; });
