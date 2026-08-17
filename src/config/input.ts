export const VIEW_INPUT = Object.freeze({
  panKeyCode: "Space",
  wheelZoomRate: 0.0015,
  wheelRotationRate: 0.002,
  buttonRotationRadians: Math.PI / 12
});

export const POINTER_INPUT = Object.freeze({
  palmContactPixels: 42,
  fingerPaintStorageKey: "prodraw.input.finger-paint",
  stabilizationReferenceMilliseconds: 1000 / 120,
  maximumTailSamples: 12,
  maximumTraceSamples: 120_000
});
