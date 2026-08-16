// Минимальный читатель ZIP: central directory → имена/данные файлов.
// Распаковка deflate — нативным DecompressionStream (рантайм-зависимостей нет).
async function inflateRaw(bytes) {
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([bytes]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// buf — ArrayBuffer/Uint8Array архива. Возвращает Map(имя → Uint8Array).
export async function unzip(buf) {
  const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const dv = new DataView(u.buffer, u.byteOffset, u.byteLength);
  let p = u.length - 22; // End Of Central Directory: минимум 22 байта
  for (; p >= 0; p--) if (dv.getUint32(p, true) === 0x06054b50) break;
  if (p < 0) throw new Error('zip: no EOCD');
  const count = dv.getUint16(p + 10, true); let cd = dv.getUint32(p + 16, true);
  const dec = new TextDecoder(), out = new Map();
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(cd, true) !== 0x02014b50) break; // central directory header
    const method = dv.getUint16(cd + 10, true), csize = dv.getUint32(cd + 20, true);
    const nameLen = dv.getUint16(cd + 28, true), extraLen = dv.getUint16(cd + 30, true);
    const commentLen = dv.getUint16(cd + 32, true), lho = dv.getUint32(cd + 42, true);
    const name = dec.decode(u.subarray(cd + 46, cd + 46 + nameLen));
    const lNameLen = dv.getUint16(lho + 26, true), lExtraLen = dv.getUint16(lho + 28, true);
    const dataAt = lho + 30 + lNameLen + lExtraLen, raw = u.subarray(dataAt, dataAt + csize);
    out.set(name, method === 0 ? raw.slice() : await inflateRaw(raw));
    cd += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}
