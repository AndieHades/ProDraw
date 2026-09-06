// Раскрывает цепочку папок и прокручивает реальную панель слоёв к строке.
import { S } from '../../core/state.js';
import { folderChain } from '../../core/layers.js';

export function revealLayer(index, renderPanel) {
  const layer = S.layers[index]; if (!layer) return false;
  for (const folder of folderChain(layer.fid)) folder.open = true;
  renderPanel();
  requestAnimationFrame(() => document.querySelector(`[data-li="${index}"]`)
    ?.scrollIntoView({ block: 'center' }));
  return true;
}
