import type { PsdImportBitmap, PsdImportNode,
  PsdStackOrder } from "../../contracts/psdImport.ts";

const MAX_SAMPLES = 4096;
type SampleLayer = { bitmap: PsdImportBitmap; opacity: number };

function simpleLayers(nodes: readonly PsdImportNode[], output: SampleLayer[],
  visible = true, supported = true): void {
  for (const node of nodes) {
    const nodeVisible = visible && node.visible;
    if (node.kind === "group") {
      const passThrough = node.blendMode === "pass through" && node.opacity === 1 &&
        node.effects.length === 0;
      simpleLayers(node.children, output, nodeVisible, supported && passThrough);
    } else if (supported && nodeVisible && node.bitmap &&
      node.blendMode === "normal" && !node.clipping && node.masks.length === 0 &&
      node.effects.length === 0 && !node.adjustment) {
      output.push({ bitmap: node.bitmap, opacity: node.opacity });
    }
  }
}

function pixel(layer: SampleLayer, x: number, y: number): Uint8ClampedArray | null {
  const localX = x - layer.bitmap.left, localY = y - layer.bitmap.top;
  if (localX < 0 || localY < 0 || localX >= layer.bitmap.width ||
    localY >= layer.bitmap.height) return null;
  const offset = (localY * layer.bitmap.width + localX) * 4;
  return layer.bitmap.rgba.subarray(offset, offset + 4);
}

function compositeAt(layers: readonly SampleLayer[], x: number, y: number): number[] {
  let red = 0, green = 0, blue = 0, alpha = 0;
  for (const layer of layers) {
    const source = pixel(layer, x, y); if (!source) continue;
    const sourceAlpha = (source[3] ?? 0) / 255 * layer.opacity;
    if (!sourceAlpha) continue;
    const outputAlpha = sourceAlpha + alpha * (1 - sourceAlpha);
    const mix = (channel: number, current: number) => outputAlpha
      ? (channel * sourceAlpha + current * alpha * (1 - sourceAlpha)) / outputAlpha : 0;
    red = mix(source[0] ?? 0, red); green = mix(source[1] ?? 0, green);
    blue = mix(source[2] ?? 0, blue); alpha = outputAlpha;
  }
  return [Math.round(red), Math.round(green), Math.round(blue), Math.round(alpha * 255)];
}

function difference(left: ArrayLike<number>, right: ArrayLike<number>): number {
  let total = 0;
  for (let index = 0; index < left.length; index += 1) {
    total += Math.abs((left[index] ?? 0) - (right[index] ?? 0));
  }
  return total;
}

export function inferPsdStackOrder(nodes: readonly PsdImportNode[],
  composite: PsdImportBitmap | undefined): PsdStackOrder {
  if (!composite) return "top-first";
  const forward: SampleLayer[] = []; simpleLayers(nodes, forward);
  if (forward.length < 2) return "top-first";
  const reverse = [...forward].reverse(), pixels = composite.width * composite.height;
  const stride = Math.max(1, Math.ceil(pixels / MAX_SAMPLES));
  let topScore = 0, bottomScore = 0, evidence = 0;
  for (let index = 0; index < pixels; index += stride) {
    const x = index % composite.width, y = Math.floor(index / composite.width);
    const expectedOffset = index * 4;
    const expected = composite.rgba.subarray(expectedOffset, expectedOffset + 4);
    const bottom = compositeAt(forward, x, y), top = compositeAt(reverse, x, y);
    if (difference(bottom, top) < 8) continue;
    bottomScore += difference(bottom, expected); topScore += difference(top, expected);
    evidence += 1;
  }
  if (evidence < 8) return "top-first";
  const margin = Math.max(evidence * 4, Math.min(topScore, bottomScore) * 0.03);
  return bottomScore + margin < topScore ? "bottom-first" : "top-first";
}
