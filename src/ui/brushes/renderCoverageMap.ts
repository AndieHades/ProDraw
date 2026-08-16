import type { CoverageMap } from "../../contracts/brush";

export function renderCoverageMap(canvas: HTMLCanvasElement, map: CoverageMap | null): void {
  const width = map?.width ?? 1;
  const height = map?.height ?? 1;
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, width, height);
  if (!map) return;
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < map.data.length; index += 1) {
    const offset = index * 4;
    rgba[offset] = 245; rgba[offset + 1] = 245; rgba[offset + 2] = 248;
    rgba[offset + 3] = map.data[index]!;
  }
  context.putImageData(new ImageData(rgba, width, height), 0, 0);
}
