import 'fake-indexeddb/auto';
/* global indexedDB */
import { beforeEach, describe, expect, it } from 'vitest';
import { getDoc, listGalleryDocs, saveDoc,
  updateGalleryDoc } from '../../src/core/storage.ts';
import { loadStoredWork, removeItem } from '../../src/systems/gallery/store.ts';

const DATABASE = 'pixelheart';

const requestResult = (request) => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

async function deleteDatabase() {
  await requestResult(indexedDB.deleteDatabase(DATABASE));
}

async function seedVersionOne(records) {
  const request = indexedDB.open(DATABASE, 1);
  request.onupgradeneeded = () => request.result
    .createObjectStore('docs', { keyPath: 'id' });
  const db = await requestResult(request);
  await new Promise((resolve, reject) => {
    const tx = db.transaction('docs', 'readwrite'), store = tx.objectStore('docs');
    records.forEach((record) => store.put(record));
    tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
  });
  db.close();
}

const largeRecord = () => ({ id: 'large', kind: 'doc', folder: null,
  name: 'Large', W: 4096, H: 4096, preview: 'data:image/png;base64,preview',
  order: 20, updated: 30,
  layers: [{ name: 'Pixels', grid: [[Object.freeze([1, 2, 3, 255])]] }],
  animator: { frames: { one: { layers: [{ grid: [[1]] }] } } } });

describe('gallery storage index', () => {
  beforeEach(deleteDatabase);

  it('migrates v1 records to lightweight synchronized summaries', async () => {
    await seedVersionOne([largeRecord(), { id: 'folder', kind: 'folder', name: 'Folder' }]);
    const summaries = await listGalleryDocs(), item = summaries.find(({ id }) => id === 'large');
    expect(item).toEqual({ id: 'large', kind: 'doc', folder: null, name: 'Large',
      W: 4096, H: 4096, preview: 'data:image/png;base64,preview',
      order: 20, updated: 30 });
    expect(item).not.toHaveProperty('layers'); expect(item).not.toHaveProperty('animator');
    expect(await getDoc('large')).toHaveProperty('layers');

    await updateGalleryDoc('large', { name: 'Renamed', folder: 'folder' });
    expect((await listGalleryDocs()).find(({ id }) => id === 'large'))
      .toMatchObject({ name: 'Renamed', folder: 'folder' });
    expect(await loadStoredWork('large')).toMatchObject({ name: 'Renamed', folder: 'folder' });

    const updated = { ...largeRecord(), name: 'Saved', folder: 'folder', updated: 40 };
    await saveDoc(updated);
    expect((await listGalleryDocs()).find(({ id }) => id === 'large'))
      .toMatchObject({ name: 'Saved', folder: 'folder', updated: 40 });
    await removeItem('folder');
    expect(await getDoc('large')).toBeUndefined();
    expect(await listGalleryDocs()).toEqual([]);
  });
});
