import { PERSISTENCE } from "../../config/persistence";
import type {
  DocumentSessionSnapshot, SerializedDocument, StoredRecoveryGeneration,
  StoredRecoveryGenerationV2, RecoveryTileReference
} from "../../contracts/persistence";
import { requestResult } from "./indexedDbPromises";

const coordinateKey = (layerId: string, x: number, y: number): string =>
  `${layerId}\u0000${x}:${y}`;

function sameBuffer(left: ArrayBuffer | undefined, right: ArrayBuffer): boolean {
  if (!left || left.byteLength !== right.byteLength) return false;
  const leftBytes = new Uint8Array(left);
  const rightBytes = new Uint8Array(right);
  return leftBytes.every((value, index) => value === rightBytes[index]);
}

async function readTiles(
  database: IDBDatabase,
  keys: readonly string[]
): Promise<Map<string, ArrayBuffer>> {
  if (!keys.length) return new Map();
  const transaction = database.transaction(PERSISTENCE.recoveryTileStore, "readonly");
  const store = transaction.objectStore(PERSISTENCE.recoveryTileStore);
  const values = await Promise.all(keys.map((key) =>
    requestResult(store.get(key) as IDBRequest<ArrayBuffer | undefined>)));
  return new Map(keys.flatMap((key, index) => {
    const value = values[index];
    return value ? [[key, value] as const] : [];
  }));
}

export function recoveryTileKeys(generation: StoredRecoveryGeneration | undefined): string[] {
  if (!generation || generation.version !== 2) return [];
  return generation.manifest.layers.flatMap((layer) =>
    layer.tiles.map(({ key }) => key));
}

export async function createIncrementalRecovery(
  database: IDBDatabase,
  document: SerializedDocument,
  session: DocumentSessionSnapshot,
  generation: number,
  previous: StoredRecoveryGeneration | undefined
): Promise<{ readonly record: StoredRecoveryGenerationV2;
  readonly changedTiles: ReadonlyMap<string, ArrayBuffer> }> {
  const previousReferences = new Map<string, RecoveryTileReference>();
  if (previous?.version === 2) {
    for (const layer of previous.manifest.layers) {
      for (const tile of layer.tiles) {
        previousReferences.set(coordinateKey(layer.descriptor.id, tile.x, tile.y), tile);
      }
    }
  }
  const comparisonKeys = document.layers.flatMap((layer) => layer.tiles.flatMap((tile) => {
    const previousTile = previousReferences.get(
      coordinateKey(layer.descriptor.id, tile.x, tile.y));
    return previousTile && previousTile.revision !== tile.revision ? [previousTile.key] : [];
  }));
  const previousTiles = await readTiles(database, [...new Set(comparisonKeys)]);
  const changedTiles = new Map<string, ArrayBuffer>();
  const layers = document.layers.map((layer) => ({ descriptor: { ...layer.descriptor },
    tiles: layer.tiles.map((tile) => {
      const coordinate = coordinateKey(layer.descriptor.id, tile.x, tile.y);
      const previousTile = previousReferences.get(coordinate);
      if (previousTile && (previousTile.revision === tile.revision ||
          sameBuffer(previousTiles.get(previousTile.key), tile.bytes))) {
        return { x: tile.x, y: tile.y, revision: tile.revision, key: previousTile.key };
      }
      const key = `${document.descriptor.id}/${layer.descriptor.id}/` +
        `${tile.x}:${tile.y}/${generation}`;
      changedTiles.set(key, tile.bytes);
      return { x: tile.x, y: tile.y, revision: tile.revision, key };
    }) }));
  const record: StoredRecoveryGenerationV2 = {
    format: "prodraw-recovery-generation", version: 2,
    documentId: document.descriptor.id, generation, session,
    manifest: { descriptor: { ...document.descriptor }, activeLayerId: document.activeLayerId,
      layers, savedAt: document.savedAt }
  };
  return { record, changedTiles };
}

export async function materializeRecovery(
  database: IDBDatabase,
  generation: StoredRecoveryGeneration
): Promise<SerializedDocument> {
  if (generation.version === 1) return generation.document;
  const keys = recoveryTileKeys(generation);
  const tiles = await readTiles(database, keys);
  return { version: 1, descriptor: { ...generation.manifest.descriptor },
    activeLayerId: generation.manifest.activeLayerId,
    savedAt: generation.manifest.savedAt,
    layers: generation.manifest.layers.map((layer) => ({
      descriptor: { ...layer.descriptor },
      tiles: layer.tiles.map(({ x, y, revision, key }) => {
        const bytes = tiles.get(key);
        if (!bytes) throw new Error(`Recovery tile is missing: ${key}`);
        return { x, y, revision: revision ?? 1, bytes };
      })
    })) };
}
