import { PERSISTENCE } from "../../config/persistence";
import type {
  DocumentSessionSnapshot, RecoveryDocumentEntry, RecoveryIndexV1, RecoveryLoadResult,
  SerializedDocument, StoredRecoveryGenerationV1
} from "../../contracts/persistence";
import { restoreDocument } from "./documentSerialization";
import { requestResult, transactionComplete } from "./indexedDbPromises";
import { emptyRecoveryIndex, nextRecoveryRecords, recoveryGenerationKey } from "./recoveryRecords";
import { upgradeDocumentDatabase } from "./upgradeDocumentDatabase";

function validGeneration(
  value: StoredRecoveryGenerationV1 | undefined,
  documentId: string,
  generation: number
): value is StoredRecoveryGenerationV1 {
  return value?.format === "prodraw-recovery-generation" && value.version === 1 &&
    value.documentId === documentId && value.generation === generation;
}

export class DocumentRepository {
  readonly #database: Promise<IDBDatabase>;

  constructor(factory: IDBFactory = indexedDB) {
    this.#database = this.open(factory);
  }

  async loadRecovery(): Promise<RecoveryLoadResult> {
    const database = await this.#database;
    const index = await this.readIndex(database);
    const entry = index.documents.find(({ id }) => id === index.currentDocumentId);
    if (!entry) return { status: "empty", document: null, session: null };
    const candidates = [entry.latestGeneration, entry.previousGeneration]
      .filter((value): value is number => value !== null);
    for (const [position, generation] of candidates.entries()) {
      const stored = await this.readGeneration(database, entry.id, generation);
      if (!validGeneration(stored, entry.id, generation)) continue;
      try {
        restoreDocument(stored.document);
        return { status: position === 0 ? "current" : "previous",
          document: stored.document, session: stored.session };
      } catch { /* Try the retained last-good generation. */ }
    }
    return { status: "corrupt", document: null, session: null };
  }

  async loadCurrent(): Promise<SerializedDocument | null> {
    return (await this.loadRecovery()).document;
  }

  async saveCurrent(document: SerializedDocument): Promise<void> {
    const loaded = await this.loadRecovery();
    const revision = (loaded.session?.revision ?? 0) + 1;
    await this.saveRecovery(document, { revision, savedRevision: 0, nativeLocation: null });
  }

  async saveRecovery(
    document: SerializedDocument,
    session: DocumentSessionSnapshot
  ): Promise<void> {
    const database = await this.#database;
    const index = await this.readIndex(database);
    const records = nextRecoveryRecords(index, document, session);
    const transaction = database.transaction([
      PERSISTENCE.recoveryGenerationStore, PERSISTENCE.recoverySessionStore
    ], "readwrite");
    const generations = transaction.objectStore(PERSISTENCE.recoveryGenerationStore);
    generations.put(records.generation, recoveryGenerationKey(
      records.generation.documentId, records.generation.generation));
    if (records.obsoleteKey) generations.delete(records.obsoleteKey);
    transaction.objectStore(PERSISTENCE.recoverySessionStore)
      .put(records.index, PERSISTENCE.recoveryIndexKey);
    await transactionComplete(transaction);
  }

  async listDocuments(): Promise<readonly RecoveryDocumentEntry[]> {
    const index = await this.readIndex(await this.#database);
    return [...index.documents].sort((left, right) => right.updatedAt - left.updatedAt);
  }

  async selectDocument(id: string): Promise<RecoveryLoadResult> {
    const database = await this.#database;
    const index = await this.readIndex(database);
    if (!index.documents.some((entry) => entry.id === id)) {
      throw new Error(`Unknown recovery document: ${id}`);
    }
    const transaction = database.transaction(PERSISTENCE.recoverySessionStore, "readwrite");
    transaction.objectStore(PERSISTENCE.recoverySessionStore)
      .put({ ...index, currentDocumentId: id }, PERSISTENCE.recoveryIndexKey);
    await transactionComplete(transaction);
    return this.loadRecovery();
  }

  async clearCurrent(): Promise<void> {
    const database = await this.#database;
    const index = await this.readIndex(database);
    const entry = index.documents.find(({ id }) => id === index.currentDocumentId);
    if (!entry) return;
    const transaction = database.transaction([
      PERSISTENCE.recoveryGenerationStore, PERSISTENCE.recoverySessionStore
    ], "readwrite");
    const generations = transaction.objectStore(PERSISTENCE.recoveryGenerationStore);
    generations.delete(recoveryGenerationKey(entry.id, entry.latestGeneration));
    if (entry.previousGeneration !== null) {
      generations.delete(recoveryGenerationKey(entry.id, entry.previousGeneration));
    }
    const documents = index.documents.filter(({ id }) => id !== entry.id);
    transaction.objectStore(PERSISTENCE.recoverySessionStore).put({ ...index, documents,
      currentDocumentId: documents.at(-1)?.id ?? null }, PERSISTENCE.recoveryIndexKey);
    await transactionComplete(transaction);
  }

  private async readIndex(database: IDBDatabase): Promise<RecoveryIndexV1> {
    const transaction = database.transaction(PERSISTENCE.recoverySessionStore, "readonly");
    const request = transaction.objectStore(PERSISTENCE.recoverySessionStore)
      .get(PERSISTENCE.recoveryIndexKey) as IDBRequest<RecoveryIndexV1 | undefined>;
    return (await requestResult(request)) ?? emptyRecoveryIndex();
  }

  private async readGeneration(database: IDBDatabase, id: string, generation: number) {
    const transaction = database.transaction(PERSISTENCE.recoveryGenerationStore, "readonly");
    const request = transaction.objectStore(PERSISTENCE.recoveryGenerationStore)
      .get(recoveryGenerationKey(id, generation)) as
      IDBRequest<StoredRecoveryGenerationV1 | undefined>;
    return requestResult(request);
  }

  private open(factory: IDBFactory): Promise<IDBDatabase> {
    const request = factory.open(PERSISTENCE.databaseName, PERSISTENCE.databaseVersion);
    request.addEventListener("upgradeneeded", (event) =>
      upgradeDocumentDatabase(request, event.oldVersion));
    return requestResult(request);
  }
}
