export interface CommandLayer {
  fid?: number | null;
  visible?: boolean;
  opacity?: number;
  lock?: boolean;
  alphaLock?: boolean;
  clip?: boolean;
  reference?: boolean;
}

export interface CommandFolder {
  readonly id: number;
  parent?: number | null;
  visible?: boolean;
  opacity?: number;
}

export interface LayerCommandState {
  layers: CommandLayer[];
  folders: CommandFolder[];
  cur: number;
  bgSel: boolean;
  selFolder: number | null;
  marked: Set<number>;
  markedFolders: Set<number>;
  fxSel: Set<unknown>;
  fxCur: unknown | null;
}

export function selectLayer(state: LayerCommandState, index: number): boolean {
  if (!state.layers[index]) return false;
  state.cur = index; state.bgSel = false; state.selFolder = null;
  state.marked.clear(); state.markedFolders.clear();
  state.fxSel.clear(); state.fxCur = null; return true;
}

export function selectInsertedLayer(state: LayerCommandState, index: number): void {
  selectLayer(state, Math.max(0, Math.min(index, state.layers.length - 1)));
}
