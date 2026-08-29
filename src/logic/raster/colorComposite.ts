import type { RgbaColor } from "../../contracts/raster.ts";

function byte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function sourceOver(
  destination: RgbaColor,
  source: RgbaColor,
  opacity = 1
): RgbaColor {
  const sourceAlpha = (byte(source.alpha) / 255) * Math.max(0, Math.min(1, opacity));
  const destinationAlpha = byte(destination.alpha) / 255;
  const outputAlpha = sourceAlpha + destinationAlpha * (1 - sourceAlpha);
  if (outputAlpha === 0) return { red: 0, green: 0, blue: 0, alpha: 0 };
  const channel = (sourceValue: number, destinationValue: number) => byte(
    (byte(sourceValue) * sourceAlpha +
      byte(destinationValue) * destinationAlpha * (1 - sourceAlpha)) / outputAlpha
  );
  return {
    red: channel(source.red, destination.red),
    green: channel(source.green, destination.green),
    blue: channel(source.blue, destination.blue),
    alpha: byte(outputAlpha * 255)
  };
}

export function sourceOverBytes(
  destination: Uint8ClampedArray,
  source: Uint8ClampedArray,
  opacity = 1
): void {
  const layerOpacity = Math.max(0, Math.min(1, opacity));
  for (let offset = 0; offset < destination.length; offset += 4) {
    const sourceAlpha = ((source[offset + 3] ?? 0) / 255) * layerOpacity;
    if (sourceAlpha === 0) continue;
    const destinationAlpha = (destination[offset + 3] ?? 0) / 255;
    const outputAlpha = sourceAlpha + destinationAlpha * (1 - sourceAlpha);
    const destinationWeight = destinationAlpha * (1 - sourceAlpha);
    for (let channel = 0; channel < 3; channel += 1) {
      destination[offset + channel] = Math.round(
        ((source[offset + channel] ?? 0) * sourceAlpha +
          (destination[offset + channel] ?? 0) * destinationWeight) / outputAlpha
      );
    }
    destination[offset + 3] = Math.round(outputAlpha * 255);
  }
}

export function eraseAlpha(destination: RgbaColor, opacity = 1): RgbaColor {
  const remaining = 1 - Math.max(0, Math.min(1, opacity));
  const alpha = byte(destination.alpha * remaining);
  if (alpha === 0) return { red: 0, green: 0, blue: 0, alpha: 0 };
  return { ...destination, alpha };
}

export function mixColor(left: RgbaColor, right: RgbaColor, amount: number): RgbaColor {
  const ratio = Math.max(0, Math.min(1, amount));
  const channel = (start: number, end: number) => byte(start + (end - start) * ratio);
  return { red: channel(left.red, right.red), green: channel(left.green, right.green),
    blue: channel(left.blue, right.blue), alpha: channel(left.alpha, right.alpha) };
}

export function mixPremultiplied(
  left: RgbaColor,
  right: RgbaColor,
  amount: number
): RgbaColor {
  const ratio = Math.max(0, Math.min(1, amount));
  const leftAlpha = byte(left.alpha) / 255;
  const rightAlpha = byte(right.alpha) / 255;
  const alpha = leftAlpha + (rightAlpha - leftAlpha) * ratio;
  if (alpha <= 0) return { red: 0, green: 0, blue: 0, alpha: 0 };
  const channel = (leftValue: number, rightValue: number): number => byte(
    (byte(leftValue) * leftAlpha * (1 - ratio) +
      byte(rightValue) * rightAlpha * ratio) / alpha
  );
  return { red: channel(left.red, right.red), green: channel(left.green, right.green),
    blue: channel(left.blue, right.blue), alpha: byte(alpha * 255) };
}
