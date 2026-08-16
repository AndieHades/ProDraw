// Низкоуровневая запись PSD (8BPS): слои/группы (lsct), видимость, прозрачность,
// raw-каналы. Принимает готовые дескрипторы — структуру собирает psd.js.
// Слой: { name, opacity 0..255, hidden, clip, lsct (0|1 open|2 closed|3 bound), data }.
// data: { 0:R,1:G,2:B,3:A } по W×H (Uint8) или null для разделителей групп.
const MIME = 'image/vnd.adobe.photoshop';

function bw() { const chunks = []; let len = 0; const push = (a) => { chunks.push(a); len += a.length; };
  return { get length() { return len; }, chunks, bytes: push,
    u8: (...v) => push(Uint8Array.from(v)),
    u16: (v) => push(Uint8Array.from([(v >> 8) & 255, v & 255])),
    u32: (v) => push(Uint8Array.from([(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255])),
    ascii: (s) => push(Uint8Array.from([...s].map((c) => c.charCodeAt(0) & 255))),
    zeros: (n) => push(new Uint8Array(n)),
    append: (w) => { for (const c of w.chunks) push(c); } };
}

const pascalAscii = (name) => { let a = ''; for (const ch of name) a += ch.charCodeAt(0) < 128 ? ch : '_'; return a.slice(0, 31) || 'Layer'; };
const plane = (L, cid, W, H) => (L.data ? L.data[cid === -1 ? 3 : cid] : new Uint8Array(0));

function record(li, L, W, H) {
  const has = !!L.data; li.u32(0); li.u32(0); li.u32(has ? H : 0); li.u32(has ? W : 0);
  const len = has ? W * H : 0; li.u16(4);
  for (const cid of [0, 1, 2, -1]) { li.u16(cid & 0xffff); li.u32(2 + len); }
  li.ascii('8BIM'); li.ascii('norm');
  li.u8(L.opacity); li.u8(L.clip ? 1 : 0); li.u8(L.hidden ? 2 : 0); li.u8(0);
  const ex = bw(); ex.u32(0); ex.u32(0); // mask + blending ranges (пусто)
  const pa = pascalAscii(L.name); ex.u8(pa.length); ex.ascii(pa); for (let k = 1 + pa.length; k % 4; k++) ex.u8(0);
  ex.ascii('8BIM'); ex.ascii('luni'); ex.u32(4 + L.name.length * 2); ex.u32(L.name.length); for (const ch of L.name) ex.u16(ch.charCodeAt(0));
  if (L.lsct) { ex.ascii('8BIM'); ex.ascii('lsct'); ex.u32(4); ex.u32(L.lsct); }
  if (ex.length % 2) ex.u8(0);
  li.u32(ex.length); li.append(ex);
}

export function writePsd({ W, H, layers, comp }) {
  const m = bw();
  m.ascii('8BPS'); m.u16(1); m.zeros(6); m.u16(4); m.u32(H); m.u32(W); m.u16(8); m.u16(4);
  m.u32(0); m.u32(0); // color mode data + image resources (пусто)
  const li = bw(); li.u16(layers.length & 0xffff);
  for (const L of layers) record(li, L, W, H);
  for (const L of layers) for (const cid of [0, 1, 2, -1]) { li.u16(0); li.bytes(plane(L, cid, W, H)); }
  if (li.length % 2) li.u8(0);
  m.u32(4 + li.length + 4); m.u32(li.length); m.append(li); m.u32(0);
  m.u16(0); for (const cid of [0, 1, 2, 3]) m.bytes(comp[cid]); // merged image (RGBA, raw)
  return new Blob(m.chunks, { type: MIME });
}
export { MIME };
