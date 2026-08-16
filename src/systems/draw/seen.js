// Клетки, уже затронутые текущим штрихом — чтобы полупрозрачная кисть/коррекция
// не красили клетку дважды за один штрих. Сбрасывается при снимке истории.
import * as bus from '../../core/bus.js';

export const strokeSeen = new Set();
bus.on('snapshot', () => strokeSeen.clear());
