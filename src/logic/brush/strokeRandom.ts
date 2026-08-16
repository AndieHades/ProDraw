export function strokeRandom(
  brushId: string,
  index: number,
  salt: number
): number {
  let hash = 2166136261 ^ index ^ Math.imul(salt, 374761393);
  for (let offset = 0; offset < brushId.length; offset += 1) {
    hash ^= brushId.charCodeAt(offset);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 1274126177);
  return (hash >>> 0) / 0xffffffff;
}
