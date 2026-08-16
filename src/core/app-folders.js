const DB = 'pixelheart-app-folders', STORE = 'handles', VER = 1;
let dbp = null;

const canFs = () => typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';

function openDb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB, VER);
    r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  return dbp;
}

async function run(mode, fn) {
  const db = await openDb(); if (!db) return null;
  return new Promise((res, rej) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error);
  });
}

async function permission(handle, write = false) {
  if (!handle || !handle.queryPermission) return false;
  const opts = { mode: write ? 'readwrite' : 'read' };
  if ((await handle.queryPermission(opts)) === 'granted') return true;
  return (await handle.requestPermission(opts)) === 'granted';
}

export async function appFolder(kind, write = false, prompt = write) {
  let handle = await run('readonly', (s) => s.get(kind));
  if (handle && await permission(handle, write)) return handle;
  if (!canFs() || !prompt) return null;
  try {
    handle = await window.showDirectoryPicker({ id: 'pixelheart-' + kind, mode: write ? 'readwrite' : 'read' });
    if (await permission(handle, write)) await run('readwrite', (s) => s.put(handle, kind));
    return handle;
  } catch (e) {
    return null;
  }
}

export async function writeAppFile(kind, name, blob) {
  const dir = await appFolder(kind, true);
  if (!dir || !blob) return false;
  try {
    const fh = await dir.getFileHandle(name, { create: true });
    const wr = await fh.createWritable();
    await wr.write(blob); await wr.close();
    return true;
  } catch (e) {
    return false;
  }
}

export async function deleteAppFile(kind, name) {
  const dir = await appFolder(kind, true, false);
  if (!dir || !dir.removeEntry) return false;
  try {
    await dir.removeEntry(name);
    return true;
  } catch (e) {
    return false;
  }
}

export async function readAppFiles(kind, accept) {
  const dir = await appFolder(kind, false, false);
  if (!dir || !dir.values) return [];
  const out = [];
  try {
    for await (const h of dir.values()) if (h.kind === 'file') {
      const f = await h.getFile();
      if (!accept || accept(f)) out.push(f);
    }
  } catch (e) {}
  return out;
}
