export interface StructureLayer {
  fid?: number | null;
  effects?: readonly unknown[];
}

export interface StructureFolder {
  readonly id: number;
  parent?: number | null;
  emptyPos?: number;
  effects?: readonly unknown[];
}

export interface StructureState {
  layers: StructureLayer[];
  folders: StructureFolder[];
  layerSeq: number;
  folderSeq: number;
  cur: number;
  bgSel: boolean;
  selFolder: number | null;
  marked: Set<number>;
  markedFolders: Set<number>;
  fxSel: Set<unknown>;
  fxCur: unknown | null;
  fxDraft: unknown | null;
}

export interface StoredField {
  readonly present: boolean;
  readonly value: unknown;
}

export interface StoredLayer {
  readonly identity: number;
  readonly ref: StructureLayer;
  readonly fid: StoredField;
}

export interface StoredFolder {
  readonly identity: number;
  readonly ref: StructureFolder;
  readonly parent: StoredField;
  readonly emptyPos: StoredField;
}

export interface StructureEntry {
  readonly kind: "structure-patch";
  readonly layers: readonly StoredLayer[];
  readonly folders: readonly StoredFolder[];
  readonly selection: {
    readonly cur: number;
    readonly bgSel: boolean;
    readonly selFolder: number | null;
    readonly marked: readonly number[];
    readonly markedFolders: readonly number[];
    readonly fxSel: readonly unknown[];
    readonly fxCur: unknown | null;
  };
  readonly layerSeq: number;
  readonly folderSeq: number;
}
