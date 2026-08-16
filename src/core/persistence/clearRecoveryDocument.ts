import { PERSISTENCE } from "../../config/persistence";
import type {
  RecoveryDocumentEntry, RecoveryIndexV1, StoredRecoveryGeneration
} from "../../contracts/persistence";
import { transactionComplete } from "./indexedDbPromises";
import { recoveryTileKeys } from "./incrementalRecovery";
import { recoveryGenerationKey } from "./recoveryRecords";

export async function clearRecoveryDocument(
  database: IDBDatabase,
  index: RecoveryIndexV1,
  entry: RecoveryDocumentEntry,
  latest: StoredRecoveryGeneration | undefined,
  previous: StoredRecoveryGeneration | undefined
): Promise<void> {
  const transaction = database.transaction([
    PERSISTENCE.recoveryGenerationStore, PERSISTENCE.recoverySessionStore,
    PERSISTENCE.recoveryTileStore
  ], "readwrite");
  const generations = transaction.objectStore(PERSISTENCE.recoveryGenerationStore);
  generations.delete(recoveryGenerationKey(entry.id, entry.latestGeneration));
  if (entry.previousGeneration !== null) {
    generations.delete(recoveryGenerationKey(entry.id, entry.previousGeneration));
  }
  const tiles = transaction.objectStore(PERSISTENCE.recoveryTileStore);
  for (const key of new Set([...recoveryTileKeys(latest), ...recoveryTileKeys(previous)])) {
    tiles.delete(key);
  }
  const documents = index.documents.filter(({ id }) => id !== entry.id);
  transaction.objectStore(PERSISTENCE.recoverySessionStore).put({ ...index, documents,
    currentDocumentId: documents.at(-1)?.id ?? null }, PERSISTENCE.recoveryIndexKey);
  await transactionComplete(transaction);
}
