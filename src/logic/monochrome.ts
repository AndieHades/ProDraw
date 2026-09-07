export const monochromeValue = (red: number, green: number, blue: number): number =>
  Math.round(red * 0.299 + green * 0.587 + blue * 0.114);

export function monochromeColor(color: readonly number[]): number[] {
  const value = monochromeValue(color[0] ?? 0, color[1] ?? 0, color[2] ?? 0);
  return color.length > 3
    ? [value, value, value, color[3] ?? 255] : [value, value, value];
}

export function monochromeRgba<Data extends Uint8ClampedArray | number[]>(
  data: Data
): Data {
  for (let offset = 0; offset < data.length; offset += 4) {
    if (!data[offset + 3]) continue;
    const value = monochromeValue(data[offset] ?? 0, data[offset + 1] ?? 0,
      data[offset + 2] ?? 0);
    data[offset] = value; data[offset + 1] = value; data[offset + 2] = value;
  }
  return data;
}
