export const PERSISTENCE = Object.freeze({
  databaseName: "prodraw-documents",
  databaseVersion: 3,
  legacyDocumentStore: "documents",
  legacyCurrentDocumentKey: "current",
  recoveryGenerationStore: "document-generations",
  recoveryTileStore: "document-tiles",
  recoverySessionStore: "document-session",
  recoveryIndexKey: "index-v1",
  retainedGenerations: 2,
  autosaveDelayMs: 700,
  closeFlushTimeoutMs: 4_000
});
