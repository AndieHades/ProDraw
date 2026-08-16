// Цвета холста для JS-рендера, читаются из CSS-токенов (var(--cv-*)) и
// обновляются при смене темы. Дефолты — тёмная тема (на случай headless).
import * as bus from '../core/bus.js';

export const C = { bg: '#0d0d10', doc: '#141419', grid: 'rgba(255,255,255,.05)', accent: '#3d8bfd', fg: '#fff',
  tileGrid: '#ff9f43', checkA: '#26262c', checkB: '#1d1d23', prevBg: '#101014', hint: '#9a9aa3' };
const KEYS = { bg: '--cv-bg', doc: '--cv-doc', grid: '--cv-grid', accent: '--accent', fg: '--cv-fg',
  tileGrid: '--cv-tilegrid', checkA: '--cv-check-a', checkB: '--cv-check-b', prevBg: '--cv-prev-bg', hint: '--cv-hint' };

export function refreshColors() {
  if (typeof getComputedStyle !== 'function') return;
  const cs = getComputedStyle(document.documentElement);
  for (const k in KEYS) { const v = cs.getPropertyValue(KEYS[k]).trim(); if (v) C[k] = v; }
}

bus.on('theme', refreshColors);
