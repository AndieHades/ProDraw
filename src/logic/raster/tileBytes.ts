export function isEmptyTile(bytes: Uint8ClampedArray): boolean {
  return bytes.every((value) => value === 0);
}

export function sameTileBytes(
  left: Uint8ClampedArray | undefined,
  right: Uint8ClampedArray | null
): boolean {
  if (!left || !right) return !left && !right;
  return left.length === right.length &&
    left.every((value, index) => value === right[index]);
}
