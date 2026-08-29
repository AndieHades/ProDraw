export interface EncodedPng { readonly name: string; readonly blob: Blob;
  readonly mime: "image/png"; readonly desc: "PNG" }
export const PNG = {
  id: "png", label: "PNG", ext: "png", mime: "image/png" as const, desc: "PNG" as const,
  supportsFlattened: true, supportsLayered: false, supportsSeparateFiles: true,
  supportsFolders: false, supportsLayerEffects: false, supportsHiddenLayers: false,
  encode(canvas: HTMLCanvasElement, name: string): Promise<EncodedPng> {
    return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve({
      name: `${name}.png`, blob, mime: "image/png", desc: "PNG"
    }) : reject(new Error("PNG encoding failed")), "image/png"));
  }
};
