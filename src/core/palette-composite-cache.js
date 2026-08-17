function visualSignature(state) {
  const layers = state.layers.map((layer) => [layer.visible !== false, layer.opacity,
    layer.fid, !!layer.clip, layer.kind, layer.effects]);
  const folders = state.folders.map((folder) => [folder.id, folder.parent,
    folder.visible !== false, folder.opacity, folder.effects]);
  return JSON.stringify([state.W, state.H, state.bg, layers, folders]);
}

function hasLivePreview(state) {
  return Boolean(state.cropMode || state.rotMode || state.rotPrev ||
    state.moveDrag || state.selFloat || state.fxDraft);
}

export class PaletteCompositeCache {
  #source = null;

  accept(source, state, revision) {
    if (!source || hasLivePreview(state)) { this.#source = null; return; }
    this.#source = { ...source, revision, visual: visualSignature(state) };
  }

  current(state, revision) {
    const source = this.#source;
    return source && source.width === state.W && source.height === state.H &&
      source.revision === revision && source.visual === visualSignature(state)
      ? source : null;
  }
}
