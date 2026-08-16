async function inflateRaw(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const format = "deflate-raw" as CompressionFormat;
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream(format));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function unzip(bytes: Uint8Array<ArrayBuffer>): Promise<
  ReadonlyMap<string, Uint8Array<ArrayBuffer>>
> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end -= 1;
  if (end < 0) throw new Error("ZIP end record is missing");
  const count = view.getUint16(end + 10, true);
  let cursor = view.getUint32(end + 16, true);
  const decoder = new TextDecoder();
  const entries = new Map<string, Uint8Array<ArrayBuffer>>();
  for (let index = 0; index < count; index += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) {
      throw new Error("ZIP central directory is corrupt");
    }
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    const localName = view.getUint16(localOffset + 26, true);
    const localExtra = view.getUint16(localOffset + 28, true);
    const dataOffset = localOffset + 30 + localName + localExtra;
    const raw = bytes.slice(dataOffset, dataOffset + compressedSize);
    if (method !== 0 && method !== 8) throw new Error(`Unsupported ZIP method: ${method}`);
    entries.set(name, method === 0 ? raw : await inflateRaw(raw));
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}
