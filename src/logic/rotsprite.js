// Чистый поворот пиксель-арта (RotSprite: EPX-апскейл → поворот → даунскейл по моде).
// Чисто: src — Int32Array (0 = прозрачно).
function epxUp(src, w, h) { // Scale2x/EPX ×2 — сохраняет наклоны и линии
  const W2 = w * 2, H2 = h * 2, out = new Int32Array(W2 * H2);
  const at = (x, y) => src[Math.min(Math.max(y, 0), h - 1) * w + Math.min(Math.max(x, 0), w - 1)];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const P = src[y * w + x], A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
    let e0 = P, e1 = P, e2 = P, e3 = P;
    if (C === A && C !== D && A !== B) e0 = A;
    if (A === B && A !== C && B !== D) e1 = B;
    if (D === C && D !== B && C !== A) e2 = C;
    if (B === D && B !== A && D !== C) e3 = D;
    out[(y * 2) * W2 + x * 2] = e0; out[(y * 2) * W2 + x * 2 + 1] = e1;
    out[(y * 2 + 1) * W2 + x * 2] = e2; out[(y * 2 + 1) * W2 + x * 2 + 1] = e3;
  }
  return { data: out, w: W2, h: H2 };
}
const lum601 = (v) => 0.299 * ((v >>> 24) & 255) + 0.587 * ((v >>> 16) & 255) + 0.114 * ((v >>> 8) & 255);

export function rotSprite(src, w, h, ang, scale) {
  let u = { data: src, w, h }; for (let s = 1; s < scale; s *= 2) u = epxUp(u.data, u.w, u.h);
  const ws = u.w, hs = u.h, co = Math.cos(ang), si = Math.sin(ang);
  const oW = Math.ceil(Math.abs(w * co) + Math.abs(h * si)) + 1, oH = Math.ceil(Math.abs(w * si) + Math.abs(h * co)) + 1;
  const rw = oW * scale, rh = oH * scale, rcx = rw / 2, rcy = rh / 2, scx = ws / 2, scy = hs / 2;
  const rot = new Int32Array(rw * rh);
  for (let Y = 0; Y < rh; Y++) for (let X = 0; X < rw; X++) {
    const dx = X + 0.5 - rcx, dy = Y + 0.5 - rcy, rx = dx * co + dy * si, ry = -dx * si + dy * co;
    const sx = Math.floor(rx + scx), sy = Math.floor(ry + scy);
    rot[Y * rw + X] = (sx >= 0 && sy >= 0 && sx < ws && sy < hs) ? u.data[sy * ws + sx] : 0;
  }
  const out = new Int32Array(oW * oH), f = new Map();
  for (let oy = 0; oy < oH; oy++) for (let ox = 0; ox < oW; ox++) {
    f.clear(); let best = 0, bn = -1, bl = -1; // мода блока; при равенстве — непрозрачный и более светлый
    for (let yy = 0; yy < scale; yy++) for (let xx = 0; xx < scale; xx++) {
      const c = rot[(oy * scale + yy) * rw + ox * scale + xx], n = (f.get(c) || 0) + 1; f.set(c, n);
      const l = c === 0 ? -1 : lum601(c);
      if (n > bn || (n === bn && l > bl)) { bn = n; best = c; bl = l; }
    }
    out[oy * oW + ox] = best;
  }
  return { data: out, w: oW, h: oH };
}
