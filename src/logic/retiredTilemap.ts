type RecordValue = Record<string, unknown>;

const asRecord = (value: unknown): RecordValue | null =>
  value !== null && typeof value === "object" ? value as RecordValue : null;

export function retireTilemapLayer(value: unknown): void {
  const layer = asRecord(value);
  if (!layer) return;
  if (layer.kind === "tilemap") layer.kind = "pixel";
  delete layer.tilemap;
  delete layer.tilemapSettings;
}

const retireLayers = (value: unknown): void => {
  if (Array.isArray(value)) value.forEach(retireTilemapLayer);
};

export function retireTilemapRecord<T>(value: T): T {
  const record = asRecord(value);
  if (!record) return value;
  retireLayers(record.layers);
  const animator = asRecord(record.animator);
  const frames = asRecord(animator?.frames);
  if (frames) {
    Object.values(frames).forEach((value) => {
      const frame = asRecord(value);
      retireLayers(frame?.layers);
    });
  }
  delete record.tilesets;
  delete record.tilesetSeq;
  return value;
}
