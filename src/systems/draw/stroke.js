// Жизненный цикл штриха: начать (снимок + сброс pp), отменить (откат), завершить
// (обновить список слоёв, если панель открыта).
import { S } from '../../core/state.js';
import * as bus from '../../core/bus.js';
import { $ } from '../../core/dom.js';
import { snapshot, restore } from '../../core/history.js';
import { resetPP } from './pixel-perfect.js';
import { resetScatter } from './brush.js';

export function beginStroke() { snapshot(); S.stroke = true; resetPP(); resetScatter(); }
export function cancelStroke() { if (!S.stroke) return; if (S.undoStack.length) restore(S.undoStack.pop()); S.stroke = false; }
export function afterStroke() { const p = $('lay-pop'); if (p && p.classList.contains('on')) bus.emit('layers'); }
