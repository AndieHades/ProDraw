export const monochromeValue = (red, green, blue) => Math.round(
  red * 0.299 + green * 0.587 + blue * 0.114);

export function monochromeColor(color) {
  const value = monochromeValue(color[0], color[1], color[2]);
  return color.length > 3
    ? [value, value, value, color[3]] : [value, value, value];
}

export function monochromeRgba(data) {
  for (let offset = 0; offset < data.length; offset += 4) {
    if (!data[offset + 3]) continue;
    const value = monochromeValue(data[offset], data[offset + 1], data[offset + 2]);
    data[offset] = value; data[offset + 1] = value; data[offset + 2] = value;
  }
  return data;
}
