// Зеркальная кисть по горизонтали при зажатом X: пока клавиша держится, мазки
// дублируются по центральной вертикальной оси (через S.xMirror в symmetryConfig).
import { S } from '../core/state.js';
import * as bus from '../core/bus.js';

const typing = (t) => !!((t && t.matches && t.matches('input, textarea')) || (t && t.isContentEditable));
const set = (on) => { if (S.xMirror === on) return; S.xMirror = on; bus.emit('render'); };

export function mount() {
  window.addEventListener('keydown', (e) => { if (e.code !== 'KeyX' || e.repeat) return;
    if (typing(e.target) || document.querySelector('.ovl.on')) return; // не во время ввода/диалога
    set(true); });
  window.addEventListener('keyup', (e) => { if (e.code === 'KeyX') set(false); });
  window.addEventListener('blur', () => set(false)); // потеря фокуса не оставляет зеркало включённым
}
