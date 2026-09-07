export interface ReferenceItem { readonly id: string; readonly src: string }
export interface ReferenceImageRecord {
  readonly src: string;
  readonly img: HTMLImageElement;
  ready: boolean;
}

export interface ReferenceImageCache {
  cacheLoaded(item: ReferenceItem, image: HTMLImageElement): void;
  ensureImage(item: ReferenceItem): ReferenceImageRecord;
  delete(id: string): boolean;
  prune(items: readonly ReferenceItem[]): void;
}

export function createReferenceImageCache(onLoad: () => void): ReferenceImageCache {
  const records = new Map<string, ReferenceImageRecord>();
  const cacheLoaded = (item: ReferenceItem, image: HTMLImageElement): void => {
    records.set(item.id, { src: item.src, img: image, ready: true });
  };
  const ensureImage = (item: ReferenceItem): ReferenceImageRecord => {
    const current = records.get(item.id);
    if (current && current.src === item.src) return current;
    const record: ReferenceImageRecord = { src: item.src, img: new Image(), ready: false };
    record.img.onload = () => { record.ready = true; onLoad(); };
    record.img.onerror = () => { record.ready = false; };
    record.img.src = item.src;
    records.set(item.id, record);
    return record;
  };
  return {
    cacheLoaded,
    ensureImage,
    delete: (id: string) => records.delete(id),
    prune(items) {
      const ids = new Set(items.map((item) => item.id));
      for (const id of records.keys()) if (!ids.has(id)) records.delete(id);
    }
  };
}
