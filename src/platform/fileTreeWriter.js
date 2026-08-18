export class FileTreeUnsupportedError extends Error {
  constructor() { super('Directory export is unavailable'); this.name = 'FileTreeUnsupportedError'; }
}

async function desktopWriter(rootName, bridge) {
  const session = await bridge.fileTree.begin(rootName);
  if (!session) return null;
  let open = true;
  return {
    async write(path, blob) {
      if (!open) throw new Error('Directory export session is closed');
      await bridge.fileTree.write(session.token, path, await blob.arrayBuffer());
    },
    async commit() {
      if (!open) throw new Error('Directory export session is closed');
      const result = await bridge.fileTree.commit(session.token); open = false; return result;
    },
    async abort() {
      if (!open) return; open = false; await bridge.fileTree.abort(session.token);
    },
  };
}

async function directoryExists(parent, name) {
  try { await parent.getDirectoryHandle(name); return true; }
  catch (error) { if (error?.name === 'NotFoundError') return false; throw error; }
}

async function uniqueDirectory(parent, base) {
  for (let index = 1; index < 10000; index++) {
    const name = index === 1 ? base : `${base}_${index}`;
    if (!await directoryExists(parent, name)) {
      return { name, handle: await parent.getDirectoryHandle(name, { create: true }) };
    }
  }
  throw new Error('Could not reserve an export directory');
}

async function webWriter(rootName) {
  if (typeof window.showDirectoryPicker !== 'function') {
    throw new FileTreeUnsupportedError();
  }
  let parent;
  try { parent = await window.showDirectoryPicker({ mode: 'readwrite' }); }
  catch (error) { if (error?.name === 'AbortError') return null; throw error; }
  const root = await uniqueDirectory(parent, rootName); let open = true;
  return {
    async write(path, blob) {
      if (!open || !path.length) throw new Error('Invalid directory export write');
      let directory = root.handle;
      for (const segment of path.slice(0, -1)) {
        directory = await directory.getDirectoryHandle(segment, { create: true });
      }
      const file = await directory.getFileHandle(path.at(-1), { create: true });
      const writable = await file.createWritable(); await writable.write(blob); await writable.close();
    },
    async commit() { open = false; return { name: root.name, location: null }; },
    async abort() {
      if (!open) return; open = false;
      if (typeof parent.removeEntry === 'function') {
        await parent.removeEntry(root.name, { recursive: true }).catch(() => undefined);
      }
    },
  };
}

export function createFileTreeWriter(rootName) {
  const bridge = typeof window === 'undefined' ? null : window.prodrawDesktop;
  return bridge?.fileTree ? desktopWriter(rootName, bridge) : webWriter(rootName);
}
