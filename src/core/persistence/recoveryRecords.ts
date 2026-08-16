import type {
  DocumentSessionSnapshot, RecoveryDocumentEntry, RecoveryIndexV1,
  StoredRecoveryGenerationV1
} from "../../contracts/persistence";
import type { SerializedDocument } from "../../contracts/persistence";

export const emptyRecoveryIndex = (): RecoveryIndexV1 => ({
  format: "prodraw-recovery-index", version: 1, currentDocumentId: null, documents: []
});

export function recoveryGenerationKey(documentId: string, generation: number): string {
  return `${documentId}:${generation}`;
}

export function nextRecoveryRecords(
  index: RecoveryIndexV1,
  document: SerializedDocument,
  session: DocumentSessionSnapshot
): { readonly index: RecoveryIndexV1; readonly generation: StoredRecoveryGenerationV1;
  readonly obsoleteKey: string | null } {
  const existing = index.documents.find(({ id }) => id === document.descriptor.id);
  const number = (existing?.latestGeneration ?? 0) + 1;
  const entry: RecoveryDocumentEntry = { id: document.descriptor.id,
    name: document.descriptor.name, updatedAt: document.savedAt,
    latestGeneration: number, previousGeneration: existing?.latestGeneration ?? null, session };
  const documents = [...index.documents.filter(({ id }) => id !== entry.id), entry];
  const generation: StoredRecoveryGenerationV1 = {
    format: "prodraw-recovery-generation", version: 1,
    documentId: entry.id, generation: number, session, document
  };
  const obsoleteKey = existing?.previousGeneration == null ? null :
    recoveryGenerationKey(entry.id, existing.previousGeneration);
  return { index: { ...index, currentDocumentId: entry.id, documents },
    generation, obsoleteKey };
}
