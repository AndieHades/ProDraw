import { initializeCanvas, writePsd, type PixelData, type Psd } from "ag-psd";

initializeCanvas(
  () => { throw new Error("test fixture does not request canvas output"); },
  (width, height) => ({ width, height,
    data: new Uint8ClampedArray(width * height * 4),
    colorSpace: "srgb" }) as ImageData
);

function image(width: number, height: number, rgba: readonly number[]): PixelData {
  return { width, height, data: new Uint8ClampedArray(rgba) };
}

const transparent = image(3, 2, new Array(3 * 2 * 4).fill(0));

export function structuredPsd(compress = false): ArrayBuffer {
  const foreground = image(2, 2, [
    255, 0, 0, 1, 0, 255, 0, 128,
    0, 0, 255, 254, 255, 255, 255, 255,
  ]);
  const mask = image(2, 2, [
    0, 0, 0, 255, 64, 64, 64, 255,
    128, 128, 128, 255, 255, 255, 255, 255,
  ]);
  const psd: Psd = {
    width: 3, height: 2, imageData: transparent,
    imageResources: { resolutionInfo: {
      horizontalResolution: 300, horizontalResolutionUnit: "PPI",
      widthUnit: "Inches", verticalResolution: 300,
      verticalResolutionUnit: "PPI", heightUnit: "Inches",
    } },
    children: [{ name: "Group Ю", opened: false, opacity: 0.75,
      blendMode: "pass through", children: [{ name: "Masked α", left: 1, top: 0,
        imageData: foreground, opacity: 0.5, blendMode: "multiply",
        clipping: true, transparencyProtected: true, hidden: true,
        protected: { composite: true, transparency: true },
        mask: { left: 1, top: 0, defaultColor: 255,
          positionRelativeToLayer: false, userMaskDensity: 0.5,
          userMaskFeather: 1.25, imageData: mask },
        effects: { dropShadow: [{ enabled: true, opacity: 0.6,
          size: { units: "Pixels", value: 3 }, angle: 120,
          distance: { units: "Pixels", value: 2 }, color: { r: 1, g: 2, b: 3 },
          blendMode: "multiply" }], solidFill: [{ enabled: true,
          opacity: 0.4, color: { r: 10, g: 20, b: 30 }, blendMode: "normal" }] } }] }],
  };
  return writePsd(psd, { compress, generateThumbnail: false });
}

export function nestedPsd(): ArrayBuffer {
  const pixel = image(1, 1, [40, 80, 120, 192]);
  const psd: Psd = { width: 1, height: 1, imageData: image(1, 1, [0, 0, 0, 0]),
    children: [{ name: "Outer", blendMode: "normal", opacity: 0.8, children: [
      { name: "Inner", blendMode: "pass through", children: [
        { name: "Pixel", imageData: pixel }
      ] }
    ] }] };
  return writePsd(psd, { generateThumbnail: false });
}

export function psdHeader(width: number, height: number, depth = 8): ArrayBuffer {
  const buffer = new ArrayBuffer(26), bytes = new Uint8Array(buffer);
  bytes.set([56, 66, 80, 83]);
  const view = new DataView(buffer);
  view.setUint16(4, 1); view.setUint16(12, 4);
  view.setUint32(14, height); view.setUint32(18, width);
  view.setUint16(22, depth); view.setUint16(24, 3);
  return buffer;
}
