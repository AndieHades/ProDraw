import { PERSISTENCE } from "../../config/persistence";
import type {
  DocumentSessionSnapshot, RecoveryDocumentEntry, RecoveryIndexV1, RecoveryLoadResult,
  SerializedDocument, StoredRecoveryGeneration
} from "../../contracts/persistence";
import { restoreDocument } from "./documentSerialization";
import { clearRecoveryDocument } from "./clearRecoveryDocument";
import { createIncrementalRecovery, materializeRecovery, recoveryTileKeys } from
  "./incrementalRecovery";
import { requestResult, transactionComplete } from "./indexedDbPromises";
import { emptyRecoveryIndex, nextRecoveryRecords, recoveryGenerationKey } from "./recoveryRecords";
import { upgradeDocumentDatabase } from "./upgradeDocumentDatabase";

function validGeneration(
  value: StoredRecoveryGeneration | undefined,
  documentId: string,
  generation: number
): value is StoredRecoveryGeneration {
  return value?.format === "prodraw-recovery-generation" &&
    (value.version === 1 || value.version === 2) &&
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
        const document = await materializeRecovery(database, stored);
        restoreDocument(document);
        return { status: position === 0 ? "current" : "previous",
          document, session: stored.session };
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
    const existing = index.documents.find(({ id }) => id === document.descriptor.id);
    const previous = existing ? await this.readGeneration(database, existing.id,
      existing.latestGeneration) : undefined;
    const obsolete = existing?.previousGeneration == null ? undefined :
      await this.readGeneration(database, existing.id, existing.previousGeneration);
    const incremental = await createIncrementalRecovery(database, document, session,
      records.generation.generation, previous);
    const retainedKeys = new Set([
      ...recoveryTileKeys(incremental.record), ...recoveryTileKeys(previous)
    ]);
    const transaction = database.transaction([
      PERSISTENCE.recoveryGenerationStore, PERSISTENCE.recoverySessionStore,
      PERSISTENCE.recoveryTileStore
    ], "readwrite");
    const generations = transaction.objectStore(PERSISTENCE.recoveryGenerationStore);
    generations.put(incremental.record, recoveryGenerationKey(
      incremental.record.documentId, incremental.record.generation));
    if (records.obsoleteKey) generations.delete(records.obsoleteKey);
    const tiles = transaction.objectStore(PERSISTENCE.recoveryTileStore);
    for (const [key, bytes] of incremental.changedTiles) tiles.put(bytes, key);
    for (const key of recoveryTileKeys(obsolete)) {
      if (!retainedKeys.has(key)) tiles.delete(key);
    }
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
    const latest = await this.readGeneration(database, entry.id, entry.latestGeneration);
    const previous = entry.previousGeneration === null ? undefined :
      await this.readGeneration(database, entry.id, entry.previousGeneration);
    await clearRecoveryDocument(database, index, entry, latest, previous);
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
      IDBRequest<StoredRecoveryGeneration | undefined>;
    return requestResult(request);
  }

  private open(factory: IDBFactory): Promise<IDBDatabase> {
    const request = factory.open(PERSISTENCE.databaseName, PERSISTENCE.databaseVersion);
    request.addEventListener("upgradeneeded", (event) =>
      upgradeDocumentDatabase(request, event.oldVersion));
    return requestResult(request);
  }
}
