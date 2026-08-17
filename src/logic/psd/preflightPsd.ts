import { PSD_IMPORT_LIMITS } from "../../config/psd-import";
import { PsdDecodeError } from "../../core/psd/PsdDecodeError";

export interface PsdHeader {
  readonly version: 1 | 2;
  readonly channels: number;
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly colorMode: number;
}

const signature = (bytes: Uint8Array): string =>
  String.fromCharCode(...bytes.subarray(0, 4));

export function preflightPsd(buffer: ArrayBuffer): PsdHeader {
  if (buffer.byteLength > PSD_IMPORT_LIMITS.maximumFileBytes) {
    throw new PsdDecodeError("file-too-large", "PSD file exceeds the byte limit");
  }
  if (buffer.byteLength < 26) {
    throw new PsdDecodeError("invalid-header", "PSD header is truncated");
  }
  const bytes = new Uint8Array(buffer);
  if (signature(bytes) !== "8BPS") {
    throw new PsdDecodeError("invalid-signature", "PSD signature is missing");
  }
  const view = new DataView(buffer);
  const rawVersion = view.getUint16(4);
  if (rawVersion !== 1 && rawVersion !== 2) {
    throw new PsdDecodeError("unsupported-version", "PSD version is unsupported");
  }
  const header: PsdHeader = {
    version: rawVersion, channels: view.getUint16(12),
    height: view.getUint32(14), width: view.getUint32(18),
    depth: view.getUint16(22), colorMode: view.getUint16(24),
  };
  if (header.channels < 1 || header.width < 1 || header.height < 1) {
    throw new PsdDecodeError("invalid-header", "PSD dimensions or channels are invalid");
  }
  if (!PSD_IMPORT_LIMITS.supportedDepths.some((depth) => depth === header.depth)) {
    throw new PsdDecodeError("unsupported-depth", "PSD bit depth is unsupported");
  }
  if (header.width > PSD_IMPORT_LIMITS.maximumDimension ||
      header.height > PSD_IMPORT_LIMITS.maximumDimension ||
      header.width * header.height > PSD_IMPORT_LIMITS.maximumPixels) {
    throw new PsdDecodeError("canvas-too-large", "PSD canvas exceeds raster limits");
  }
  return header;
}
