export interface StoredRecord {
  readonly id: string;
  readonly [key: string]: unknown;
}

export interface GalleryRecord extends StoredRecord {
  readonly kind: "doc" | "folder";
  readonly folder: string | null;
  readonly name: string;
  readonly W: number;
  readonly H: number;
  readonly preview: string;
  readonly order: number;
  readonly updated: number;
}

const DB = "pixelheart";
const STORE = "docs";
const GALLERY_STORE = "gallery-index";
const VERSION = 2;
let databasePromise: Promise<IDBDatabase> | null = null;

const finite = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;
const text = (value: unknown): string => typeof value === "string" ? value : "";

function galleryRecord(record: StoredRecord): GalleryRecord {
  return { id: record.id, kind: record.kind === "folder" ? "folder" : "doc",
    folder: typeof record.folder === "string" ? record.folder : null,
    name: text(record.name), W: finite(record.W), H: finite(record.H),
    preview: text(record.preview), order: finite(record.order),
    updated: finite(record.updated) };
}

function upgradeDatabase(request: IDBOpenDBRequest, oldVersion: number): void {
  const database = request.result, transaction = request.transaction;
  if (!transaction) return;
  const documents = database.objectStoreNames.contains(STORE)
    ? transaction.objectStore(STORE)
    : database.createObjectStore(STORE, { keyPath: "id" });
  const gallery = database.objectStoreNames.contains(GALLERY_STORE)
    ? transaction.objectStore(GALLERY_STORE)
    : database.createObjectStore(GALLERY_STORE, { keyPath: "id" });
  if (oldVersion >= 2) return;
  const cursor = documents.openCursor();
  cursor.onsuccess = () => {
    const item = cursor.result;
    if (!item) return;
    const value = item.value as StoredRecord;
    if (value.id) gallery.put(galleryRecord(value));
    item.continue();
  };
}

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  const pending = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB, VERSION); let settled = false;
    const release = () => { if (databasePromise === pending) databasePromise = null; };
    const fail = (error: unknown) => {
      if (settled) return; settled = true; release(); reject(error);
    };
    request.onupgradeneeded = (event) => upgradeDatabase(request, event.oldVersion);
    request.onsuccess = () => {
      const database = request.result;
      if (settled) { database.close(); return; }
      settled = true;
      database.onversionchange = () => { database.close(); release(); };
      database.onclose = release; resolve(database);
    };
    request.onerror = () => fail(request.error);
    request.onblocked = () => fail(new Error("IndexedDB open blocked"));
  });
  databasePromise = pending;
  return pending;
}

type StoreNames = string | readonly string[];
type RequestFactory<T> = (transaction: IDBTransaction) => IDBRequest<T> | undefined;
const retryable = (error: unknown): boolean => error instanceof DOMException &&
  ["InvalidStateError", "TransactionInactiveError"].includes(error.name);

async function run<T>(mode: IDBTransactionMode, stores: StoreNames,
  factory: RequestFactory<T>, retry = true): Promise<T | undefined> {
  const active = openDatabase(), database = await active;
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const transaction = database.transaction(stores, mode);
      const request = factory(transaction); let result: T | undefined;
      request?.addEventListener("success", () => { result = request.result; });
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error ?? request?.error);
      transaction.onabort = () => reject(transaction.error ?? request?.error ??
        new Error("IndexedDB transaction aborted"));
    });
  } catch (error) {
    if (!retry || !retryable(error)) throw error;
    try { database.close(); } catch { /* already closed */ }
    if (databasePromise === active) databasePromise = null;
    return run(mode, stores, factory, false);
  }
}

export const saveDoc = (record: StoredRecord): Promise<IDBValidKey | undefined> =>
  run("readwrite", [STORE, GALLERY_STORE], (transaction) => {
    const request = transaction.objectStore(STORE).put(record);
    transaction.objectStore(GALLERY_STORE).put(galleryRecord(record));
    return request;
  });
export const getDoc = (id: string): Promise<StoredRecord | undefined> =>
  run("readonly", STORE, (transaction) => transaction.objectStore(STORE).get(id));
export const listDocs = (): Promise<StoredRecord[]> =>
  run("readonly", STORE, (transaction) => transaction.objectStore(STORE).getAll())
    .then((records) => records ?? []);
export const getGalleryDoc = (id: string): Promise<GalleryRecord | undefined> =>
  run("readonly", GALLERY_STORE,
    (transaction) => transaction.objectStore(GALLERY_STORE).get(id));
export const listGalleryDocs = (): Promise<GalleryRecord[]> =>
  run("readonly", GALLERY_STORE,
    (transaction) => transaction.objectStore(GALLERY_STORE).getAll())
    .then((records) => records ?? []);
export const updateGalleryDoc = (id: string, fields: Readonly<Record<string, unknown>>):
Promise<boolean> => run("readwrite", GALLERY_STORE, (transaction) => {
  const store = transaction.objectStore(GALLERY_STORE), request = store.get(id);
  request.addEventListener("success", () => {
    if (request.result) store.put({ ...request.result, ...fields, id });
  });
  return request;
}).then(Boolean);
export const removeDoc = (id: string): Promise<undefined> =>
  run("readwrite", [STORE, GALLERY_STORE], (transaction) => {
    const request = transaction.objectStore(STORE).delete(id);
    transaction.objectStore(GALLERY_STORE).delete(id);
    return request;
  });
