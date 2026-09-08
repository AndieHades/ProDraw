import type { PackedRgbaRowRecord } from "../../contracts/packedRgbaGrid.ts";

export function slicePackedRow(row: PackedRgbaRowRecord, from: number,
  to: number): PackedRgbaRowRecord | null {
  let first = Math.max(0, from), last = Math.min(row.bytes.length / 4, to) - 1;
  while (first <= last && !row.bytes[first * 4 + 3]) first++;
  while (last >= first && !row.bytes[last * 4 + 3]) last--;
  if (first > last) return null;
  let opaquePixels = row.opaquePixels;
  if (first !== 0 || last !== row.bytes.length / 4 - 1) {
    opaquePixels = 0;
    for (let x = first; x <= last; x++) if (row.bytes[x * 4 + 3]) opaquePixels++;
  }
  return { y: row.y, left: row.left + first, opaquePixels,
    bytes: row.bytes.slice(first * 4, (last + 1) * 4) };
}

export function mergePackedRow(before: PackedRgbaRowRecord | undefined,
  next: PackedRgbaRowRecord, preserve: boolean): PackedRgbaRowRecord {
  if (!before) return next;
  const left = Math.min(before.left, next.left);
  const right = Math.max(before.left + before.bytes.length / 4,
    next.left + next.bytes.length / 4);
  const bytes = new Uint8ClampedArray((right - left) * 4);
  bytes.set(before.bytes, (before.left - left) * 4);
  if (next.left >= before.left + before.bytes.length / 4 ||
    next.left + next.bytes.length / 4 <= before.left) {
    bytes.set(next.bytes, (next.left - left) * 4);
    return { y: next.y, left, bytes, opaquePixels: before.opaquePixels + next.opaquePixels };
  }
  let opaquePixels = before.opaquePixels;
  for (let offset = 0; offset < next.bytes.length; offset += 4) {
    if (!next.bytes[offset + 3]) continue;
    const target = (next.left - left) * 4 + offset, occupied = !!bytes[target + 3];
    if (occupied && preserve) continue;
    for (let channel = 0; channel < 4; channel++)
      bytes[target + channel] = next.bytes[offset + channel] ?? 0;
    if (!occupied) opaquePixels++;
  }
  return { y: next.y, left, bytes, opaquePixels };
}
