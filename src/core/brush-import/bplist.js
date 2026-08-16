// Минимальный читатель binary plist (bplist00) + распаковка графа
// NSKeyedArchiver в плоский словарь скалярных настроек (числа/булевы/строки).
// Достаточно для чтения параметров кисти Procreate из Brush.archive.
function reader(buf) {
  const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const dv = new DataView(u.buffer, u.byteOffset, u.byteLength), tr = u.length - 32;
  const offSize = u[tr + 6], refSize = u[tr + 7];
  const num = Number(dv.getBigUint64(tr + 8)), top = Number(dv.getBigUint64(tr + 16)), tabStart = Number(dv.getBigUint64(tr + 24));
  const rd = (p, sz) => { let v = 0; for (let i = 0; i < sz; i++) v = v * 256 + u[p + i]; return v; };
  const offs = []; for (let i = 0; i < num; i++) offs.push(rd(tabStart + i * offSize, offSize));
  const dec = new TextDecoder();
  const len = (p) => { const lo = u[p] & 0xf; if (lo !== 0xf) return [lo, p + 1];
    const m = u[p + 1] & 0xf; return [rd(p + 2, 1 << m), p + 2 + (1 << m)]; };
  function obj(i) {
    const p = offs[i], marker = u[p], hi = marker >> 4, lo = marker & 0xf;
    if (hi === 0) return lo === 8 ? false : lo === 9 ? true : null;
    if (hi === 1) return rd(p + 1, 1 << lo); // int
    if (hi === 2) return (1 << lo) === 4 ? dv.getFloat32(p + 1) : dv.getFloat64(p + 1); // real
    if (hi === 3) return dv.getFloat64(p + 1); // date
    if (hi === 8) return { uid: rd(p + 1, lo + 1) }; // CF$UID
    if (hi === 5) { const [c, q] = len(p); return dec.decode(u.subarray(q, q + c)); } // ascii
    if (hi === 6) { const [c, q] = len(p); let s = ''; for (let k = 0; k < c; k++) s += String.fromCharCode(dv.getUint16(q + k * 2)); return s; } // utf-16be
    if (hi === 0xa) { const [c, q] = len(p); const a = []; for (let k = 0; k < c; k++) a.push(rd(q + k * refSize, refSize)); return { arr: a }; } // array
    if (hi === 0xd) { const [c, q] = len(p); const ks = [], vs = []; // dict
      for (let k = 0; k < c; k++) ks.push(rd(q + k * refSize, refSize));
      for (let k = 0; k < c; k++) vs.push(rd(q + c * refSize + k * refSize, refSize)); return { ks, vs }; }
    return undefined; // данные/сеты для скалярных настроек не нужны
  }
  return { obj, top };
}

// Brush.archive (NSKeyedArchiver) → плоский словарь { ключ: скаляр }.
// Граф: верхний объект — обёртка {$top,$objects,…}; CF$UID индексируют массив
// $objects (отдельное от глобальной таблицы пространство индексов).
export function unarchiveBrush(buf) {
  const { obj, top } = reader(buf), wrap = obj(top);
  if (!wrap || !wrap.ks) return {};
  const field = (d, name) => { for (let i = 0; i < d.ks.length; i++) if (obj(d.ks[i]) === name) return d.vs[i]; return -1; };
  const objsRef = field(wrap, '$objects'), objs = objsRef >= 0 ? (obj(objsRef) || {}).arr : null;
  const topRef = field(wrap, '$top'), topObj = topRef >= 0 ? obj(topRef) : null;
  if (!objs || !topObj || !topObj.ks) return {};
  const rootRef = field(topObj, 'root'); if (rootRef < 0) return {};
  const rootU = obj(rootRef); if (!rootU || rootU.uid == null) return {};
  const brush = obj(objs[rootU.uid]); if (!brush || !brush.ks) return {};
  const out = {};
  for (let i = 0; i < brush.ks.length; i++) {
    const key = obj(brush.ks[i]); if (typeof key !== 'string') continue;
    let v = obj(brush.vs[i]); if (v && v.uid != null) v = obj(objs[v.uid]);
    if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') out[key] = v;
  }
  return out;
}
