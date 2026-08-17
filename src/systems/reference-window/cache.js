export function createReferenceImageCache(onLoad) {
  const records = new Map();
  const cacheLoaded = (item, image) => {
    records.set(item.id, { src: item.src, img: image, ready: true });
  };
  const ensureImage = (item) => {
    const current = records.get(item.id);
    if (current && current.src === item.src) return current;
    const record = { src: item.src, img: new Image(), ready: false };
    record.img.onload = () => { record.ready = true; onLoad(); };
    record.img.onerror = () => { record.ready = false; };
    record.img.src = item.src;
    records.set(item.id, record);
    return record;
  };
  return {
    cacheLoaded,
    ensureImage,
    delete: (id) => records.delete(id),
    prune(items) {
      const ids = new Set(items.map((item) => item.id));
      for (const id of records.keys()) if (!ids.has(id)) records.delete(id);
    }
  };
}
