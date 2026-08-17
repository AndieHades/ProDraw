async function inflateRaw(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const format = "deflate-raw" as CompressionFormat;
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream(format));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function unzip(bytes: Uint8Array<ArrayBuffer>): Promise<
  ReadonlyMap<string, Uint8Array<ArrayBuffer>>
> {
  return inflateEntries(bytes, directory(bytes));
}

interface ZipEntry {
  readonly name: string;
  readonly method: number;
  readonly compressedSize: number;
  readonly dataOffset: number;
}

function directory(bytes: Uint8Array<ArrayBuffer>): readonly ZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end -= 1;
  if (end < 0) throw new Error("ZIP end record is missing");
  const count = view.getUint16(end + 10, true);
  let cursor = view.getUint32(end + 16, true);
  const decoder = new TextDecoder();
  const entries: ZipEntry[] = [];
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
    if (method !== 0 && method !== 8) throw new Error(`Unsupported ZIP method: ${method}`);
    entries.push({ name, method, compressedSize, dataOffset });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function inflateEntries(bytes: Uint8Array<ArrayBuffer>, selected: readonly ZipEntry[]):
Promise<ReadonlyMap<string, Uint8Array<ArrayBuffer>>> {
  const entries = new Map<string, Uint8Array<ArrayBuffer>>();
  for (const entry of selected) {
    const raw = bytes.slice(entry.dataOffset, entry.dataOffset + entry.compressedSize);
    entries.set(entry.name, entry.method === 0 ? raw : await inflateRaw(raw));
  }
  return entries;
}

export async function unzipEntries(bytes: Uint8Array<ArrayBuffer>,
  wantedPaths: readonly string[]): Promise<ReadonlyMap<string, Uint8Array<ArrayBuffer>>> {
  const all = directory(bytes);
  const selected = wantedPaths.flatMap((wanted) => {
    const normalized = wanted.toLowerCase();
    const matches = all.filter(({ name }) => {
      const candidate = name.replace(/\\/g, "/").toLowerCase();
      return candidate === normalized || candidate.endsWith(`/${normalized}`);
    }).sort((left, right) => {
      const reset = (name: string): number => /^reset\//i.test(name) ? 1 : 0;
      return reset(left.name) - reset(right.name) || left.name.length - right.name.length;
    });
    return matches.slice(0, 1);
  });
  return inflateEntries(bytes, selected);
}
