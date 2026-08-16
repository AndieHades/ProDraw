import type { SerializedDocument } from "../../contracts/persistence";
import { PERSISTENCE } from "../../config/persistence";
import { emptyRecoveryIndex, nextRecoveryRecords,
  recoveryGenerationKey } from "./recoveryRecords";

export function upgradeDocumentDatabase(request: IDBOpenDBRequest, oldVersion: number): void {
  const database = request.result;
  if (!database.objectStoreNames.contains(PERSISTENCE.legacyDocumentStore)) {
    database.createObjectStore(PERSISTENCE.legacyDocumentStore);
  }
  if (!database.objectStoreNames.contains(PERSISTENCE.recoveryGenerationStore)) {
    database.createObjectStore(PERSISTENCE.recoveryGenerationStore);
  }
  if (!database.objectStoreNames.contains(PERSISTENCE.recoverySessionStore)) {
    database.createObjectStore(PERSISTENCE.recoverySessionStore);
  }
  if (!database.objectStoreNames.contains(PERSISTENCE.recoveryTileStore)) {
    database.createObjectStore(PERSISTENCE.recoveryTileStore);
  }
  if (oldVersion >= 2) return;
  const transaction = request.transaction;
  if (!transaction) return;
  const legacy = transaction.objectStore(PERSISTENCE.legacyDocumentStore)
    .get(PERSISTENCE.legacyCurrentDocumentKey) as IDBRequest<SerializedDocument | undefined>;
  legacy.addEventListener("success", () => {
    if (!legacy.result) return;
    const session = { revision: 1, savedRevision: 0, nativeLocation: null };
    const records = nextRecoveryRecords(emptyRecoveryIndex(), legacy.result, session);
    transaction.objectStore(PERSISTENCE.recoveryGenerationStore).put(
      records.generation,
      recoveryGenerationKey(records.generation.documentId, records.generation.generation)
    );
    transaction.objectStore(PERSISTENCE.recoverySessionStore)
      .put(records.index, PERSISTENCE.recoveryIndexKey);
  }, { once: true });
}
