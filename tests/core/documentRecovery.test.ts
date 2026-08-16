import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { PERSISTENCE } from "../../src/config/persistence";
import type { StoredRecoveryGeneration } from "../../src/contracts/persistence";
import { createRasterDocument } from "../../src/core/document/createRasterDocument";
import { DocumentRepository } from "../../src/core/persistence/DocumentRepository";
import { restoreDocument, serializeDocument } from
  "../../src/core/persistence/documentSerialization";
import { requestResult, transactionComplete } from
  "../../src/core/persistence/indexedDbPromises";

function artwork(name: string, documentId: string) {
  const ids = [documentId, `${documentId}-layer`];
  return createRasterDocument({ name, width: 16, height: 16, dpi: 72,
    layerName: "Paint" }, () => ids.shift() ?? `${documentId}-extra`);
}

const session = (revision: number) => ({
  revision, savedRevision: 0, nativeLocation: null
});

async function corruptLatest(factory: IDBFactory, id: string, generation: number) {
  const opened = factory.open(PERSISTENCE.databaseName, PERSISTENCE.databaseVersion);
  const database = await requestResult(opened);
  const transaction = database.transaction(PERSISTENCE.recoveryGenerationStore, "readwrite");
  const store = transaction.objectStore(PERSISTENCE.recoveryGenerationStore);
  const key = `${id}:${generation}`;
  const record = await requestResult(store.get(key) as IDBRequest<StoredRecoveryGeneration>);
  const corrupt = record.version === 1
    ? { ...record, document: { ...record.document, layers: [] } }
    : { ...record, manifest: { ...record.manifest, layers: [] } };
  store.put(corrupt, key);
  await transactionComplete(transaction);
  database.close();
}

async function tileRecordCount(factory: IDBFactory): Promise<number> {
  const database = await requestResult(
    factory.open(PERSISTENCE.databaseName, PERSISTENCE.databaseVersion));
  const transaction = database.transaction(PERSISTENCE.recoveryTileStore, "readonly");
  const count = await requestResult(transaction.objectStore(PERSISTENCE.recoveryTileStore).count());
  database.close();
  return count;
}

describe("document recovery generations", () => {
  it("keeps separate works and switches the current recovery", async () => {
    const repository = new DocumentRepository(new IDBFactory());
    const first = artwork("First", "first");
    first.editableSurface().blendPixel(2, 3, { red: 20, green: 30, blue: 40, alpha: 255 });
    await repository.saveRecovery(serializeDocument(first), session(1));
    const second = artwork("Second", "second");
    await repository.saveRecovery(serializeDocument(second), session(1));

    expect((await repository.listDocuments()).map(({ id }) => id).sort())
      .toEqual(["first", "second"]);
    expect((await repository.loadRecovery()).document?.descriptor.id).toBe("second");
    const selected = await repository.selectDocument("first");
    if (!selected.document) throw new Error("First recovery is missing");
    expect(restoreDocument(selected.document).compositePixel(2, 3).alpha).toBe(255);
  });

  it("falls back to the retained intact generation", async () => {
    const factory = new IDBFactory();
    const repository = new DocumentRepository(factory);
    const document = artwork("Fallback", "fallback");
    document.editableSurface().blendPixel(4, 4,
      { red: 90, green: 20, blue: 10, alpha: 255 });
    await repository.saveRecovery(serializeDocument(document), session(1));
    document.editableSurface().blendPixel(8, 8,
      { red: 10, green: 80, blue: 200, alpha: 255 });
    await repository.saveRecovery(serializeDocument(document), session(2));
    await corruptLatest(factory, "fallback", 2);

    const recovered = await repository.loadRecovery();
    expect(recovered.status).toBe("previous");
    if (!recovered.document) throw new Error("Previous recovery is missing");
    const restored = restoreDocument(recovered.document);
    expect(restored.compositePixel(4, 4).alpha).toBe(255);
    expect(restored.compositePixel(8, 8).alpha).toBe(0);
  });

  it("migrates the old single-current record without losing pixels", async () => {
    const factory = new IDBFactory();
    const request = factory.open(PERSISTENCE.databaseName, 1);
    request.addEventListener("upgradeneeded", () =>
      request.result.createObjectStore(PERSISTENCE.legacyDocumentStore));
    const database = await requestResult(request);
    const document = artwork("Legacy", "legacy");
    document.editableSurface().blendPixel(1, 1,
      { red: 1, green: 2, blue: 3, alpha: 255 });
    const transaction = database.transaction(PERSISTENCE.legacyDocumentStore, "readwrite");
    transaction.objectStore(PERSISTENCE.legacyDocumentStore).put(
      serializeDocument(document), PERSISTENCE.legacyCurrentDocumentKey);
    await transactionComplete(transaction);
    database.close();

    const recovered = await new DocumentRepository(factory).loadRecovery();
    expect(recovered.status).toBe("current");
    if (!recovered.document) throw new Error("Migrated recovery is missing");
    expect(restoreDocument(recovered.document).compositePixel(1, 1).alpha).toBe(255);
  });

  it("reuses unchanged tile blobs and compacts unreferenced generations", async () => {
    const factory = new IDBFactory();
    const repository = new DocumentRepository(factory);
    const document = artwork("Delta", "delta");
    document.editableSurface().blendPixel(1, 1,
      { red: 10, green: 20, blue: 30, alpha: 255 });
    document.editableSurface().blendPixel(15, 15,
      { red: 30, green: 20, blue: 10, alpha: 255 });
    await repository.saveRecovery(serializeDocument(document), session(1));
    const initialTiles = await tileRecordCount(factory);
    await repository.saveRecovery(serializeDocument(document), session(2));
    expect(await tileRecordCount(factory)).toBe(initialTiles);
    document.editableSurface().blendPixel(2, 2,
      { red: 200, green: 100, blue: 40, alpha: 255 });
    await repository.saveRecovery(serializeDocument(document), session(3));
    expect(await tileRecordCount(factory)).toBe(initialTiles + 1);
    await repository.saveRecovery(serializeDocument(document), session(4));
    expect(await tileRecordCount(factory)).toBe(initialTiles);
  });
});
