import { MAX_SIZE } from "./limits.ts";

const mebibyte = 1024 * 1024;
const maximumDimension = 8192;

export const PSD_IMPORT_LIMITS = Object.freeze({
  maximumFileBytes: 512 * mebibyte,
  maximumDecodedBytes: 768 * mebibyte,
  maximumDimension,
  maximumPixels: MAX_SIZE * MAX_SIZE,
  maximumNodes: 4096,
  supportedDepths: Object.freeze([1, 8, 16, 32] as const),
  defaultDpi: 72,
});
