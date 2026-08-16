import type { SerializedDocument } from "../../contracts/persistence";
import { PERSISTENCE } from "../../config/persistence";

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), { once: true });
    request.addEventListener("error", () => reject(request.error), { once: true });
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener("abort", () => reject(transaction.error), { once: true });
    transaction.addEventListener("error", () => reject(transaction.error), { once: true });
  });
}

export class DocumentRepository {
  readonly #database: Promise<IDBDatabase>;

  constructor(factory: IDBFactory = indexedDB) {
    this.#database = this.open(factory);
  }

  async loadCurrent(): Promise<SerializedDocument | null> {
    const database = await this.#database;
    const transaction = database.transaction(PERSISTENCE.documentStore, "readonly");
    const request = transaction.objectStore(PERSISTENCE.documentStore)
      .get(PERSISTENCE.currentDocumentKey) as IDBRequest<SerializedDocument | undefined>;
    return (await requestResult(request)) ?? null;
  }

  async saveCurrent(document: SerializedDocument): Promise<void> {
    const database = await this.#database;
    const transaction = database.transaction(PERSISTENCE.documentStore, "readwrite");
    transaction.objectStore(PERSISTENCE.documentStore)
      .put(document, PERSISTENCE.currentDocumentKey);
    await transactionComplete(transaction);
  }

  async clearCurrent(): Promise<void> {
    const database = await this.#database;
    const transaction = database.transaction(PERSISTENCE.documentStore, "readwrite");
    transaction.objectStore(PERSISTENCE.documentStore).delete(PERSISTENCE.currentDocumentKey);
    await transactionComplete(transaction);
  }

  private open(factory: IDBFactory): Promise<IDBDatabase> {
    const request = factory.open(PERSISTENCE.databaseName, PERSISTENCE.databaseVersion);
    request.addEventListener("upgradeneeded", () => {
      if (!request.result.objectStoreNames.contains(PERSISTENCE.documentStore)) {
        request.result.createObjectStore(PERSISTENCE.documentStore);
      }
    });
    return requestResult(request);
  }
}
