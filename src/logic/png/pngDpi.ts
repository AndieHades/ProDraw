const signature = [137, 80, 78, 71, 13, 10, 26, 10];

function writeUint32(target: Uint8Array, offset: number, value: number): void {
  new DataView(target.buffer).setUint32(offset, value, false);
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function physicalChunk(dpi: number): Uint8Array {
  const chunk = new Uint8Array(21);
  writeUint32(chunk, 0, 9);
  chunk.set([112, 72, 89, 115], 4);
  const pixelsPerMeter = Math.round(dpi / 0.0254);
  writeUint32(chunk, 8, pixelsPerMeter);
  writeUint32(chunk, 12, pixelsPerMeter);
  chunk[16] = 1;
  writeUint32(chunk, 17, crc32(chunk.subarray(4, 17)));
  return chunk;
}

export function setPngDpi(png: Uint8Array<ArrayBuffer>, dpi: number): Uint8Array<ArrayBuffer> {
  if (!signature.every((value, index) => png[index] === value)) {
    throw new Error("Not a PNG image");
  }
  const ihdrEnd = 33;
  if (png.length < ihdrEnd) throw new Error("PNG header is incomplete");
  const chunk = physicalChunk(dpi);
  const output = new Uint8Array(png.length + chunk.length);
  output.set(png.subarray(0, ihdrEnd), 0);
  output.set(chunk, ihdrEnd);
  output.set(png.subarray(ihdrEnd), ihdrEnd + chunk.length);
  return output;
}

export function readPngDpi(png: Uint8Array<ArrayBuffer>): number | null {
  let offset = 8;
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  while (offset + 12 <= png.length) {
    const length = view.getUint32(offset, false);
    const type = new TextDecoder().decode(png.subarray(offset + 4, offset + 8));
    if (type === "pHYs" && length === 9 && png[offset + 16] === 1) {
      return Math.round(view.getUint32(offset + 8, false) * 0.0254);
    }
    offset += 12 + length;
  }
  return null;
}
