// Чистые преобразования цвета — без DOM и без состояния.
export const hexToRgb = (h) => { const s = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); };
export const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
export const rgbToHex = (c) => '#' + [c[0], c[1], c[2]].map((v) => v.toString(16).padStart(2, '0')).join('');
export const eqc = (a, b) => a && b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

// квадрат евклидова расстояния в RGB
export const colorDist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
// из кандидатов вернуть самый далёкий от ref — чтобы цвета заведомо различались
export function farthestColor(ref, candidates) { let best = candidates[0], bd = -1;
  for (const c of candidates) { const d = colorDist2(ref, c); if (d > bd) { bd = d; best = c; } } return best; }

export function rgbToHsv(r, g, b) { r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0;
  if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
  return [h, mx ? (d / mx) * 100 : 0, mx * 100]; }

export function hsvToRgb(h, s, v) { s /= 100; v /= 100; const hh = ((h % 360) + 360) % 360;
  const c = v * s, x = c * (1 - Math.abs((hh / 60) % 2 - 1)), m = v - c; let r = 0, g = 0, b = 0;
  if (hh < 60) { r = c; g = x; } else if (hh < 120) { r = x; g = c; } else if (hh < 180) { g = c; b = x; }
  else if (hh < 240) { g = x; b = c; } else if (hh < 300) { r = x; b = c; } else { r = c; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)]; }
