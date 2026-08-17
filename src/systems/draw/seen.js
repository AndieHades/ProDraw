// Клетки, уже затронутые текущим штрихом — чтобы полупрозрачная кисть/коррекция
// не красили клетку дважды за один штрих.
import * as bus from '../../core/bus.js';

export const strokeSeen = new Set();
const clear = () => strokeSeen.clear();
bus.on('stroke-begin', clear);
bus.on('snapshot', clear);
