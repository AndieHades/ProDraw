// Сериализация набора кистей в файл (.phbrush, JSON) и обратно. Маски
// покрытия/grain — base64 от Uint8Array; кисть остаётся recolorable. Без DOM.
function b64enc(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
function b64dec(str) { const bin = atob(str), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return u8; }
const encMask = (m) => (m ? { w: m.w, h: m.h, data: b64enc(m.data) } : null);
const decMask = (m) => (m ? { w: m.w, h: m.h, data: b64dec(m.data) } : null);
const FORMAT = 'pixelheart-brushes';

export function packSet(name, brushes) {
  return JSON.stringify({ format: FORMAT, version: 1, name: name || '',
    brushes: brushes.map((b) => ({ name: b.name, source: b.source || 'custom', shape: b.shape || 'shape',
      baseSize: b.baseSize || null, params: b.params || {}, cov: encMask(b.cov), grain: encMask(b.grain) })) });
}

export function unpackSet(text) {
  const j = JSON.parse(text);
  if (!j || j.format !== FORMAT || !Array.isArray(j.brushes)) throw new Error('not a brush pack');
  return { name: j.name || '', brushes: j.brushes.map((b) => ({ name: b.name, source: b.source || 'custom', shape: b.shape || 'shape',
    baseSize: b.baseSize || undefined, params: b.params || {}, cov: decMask(b.cov), grain: decMask(b.grain) })) };
}
