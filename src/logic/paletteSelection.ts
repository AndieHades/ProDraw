export function paletteRange(
  length: number, from: number, to: number, maximum = Number.POSITIVE_INFINITY
): number[] {
  const indices: number[] = [], step = to >= from ? 1 : -1;
  for (let index = from; index >= 0 && index < length && indices.length < maximum;
    index += step) {
    indices.push(index);
    if (index === to) break;
  }
  return indices;
}

export function colorsAtIndices<Color extends readonly number[]>(
  palette: readonly Color[], indices: readonly number[]
): number[][] {
  return indices.map((index) => palette[index]?.slice(0, 3) ?? []);
}
