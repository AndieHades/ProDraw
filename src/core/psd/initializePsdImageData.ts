import { initializeCanvas } from "ag-psd";

let initialized = false;

function unsupportedCanvas(): HTMLCanvasElement {
  throw new Error("PSD canvas output is disabled");
}

function createImageData(width: number, height: number): ImageData {
  return {
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
    colorSpace: "srgb",
  } as ImageData;
}

export function initializePsdImageData(): void {
  if (initialized) return;
  initializeCanvas(unsupportedCanvas, createImageData);
  initialized = true;
}
