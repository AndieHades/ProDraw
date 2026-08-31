import { PSD_IMPORT_LIMITS } from "../../config/psd-import.ts";

interface ErrorWithCode {
  readonly code?: unknown;
}

export interface PsdImportFailure {
  readonly key: string;
  readonly vars?: Readonly<Record<string, string | number>>;
}

const codeOf = (error: unknown): unknown =>
  typeof error === "object" && error !== null
    ? (error as ErrorWithCode).code
    : undefined;

export function psdImportFailure(error: unknown): PsdImportFailure {
  switch (codeOf(error)) {
    case "canvas-too-large":
      return { key: "toast.psdCanvasTooLarge", vars: {
        side: PSD_IMPORT_LIMITS.maximumDimension,
        megapixels: (PSD_IMPORT_LIMITS.maximumPixels / 1_000_000).toFixed(1),
      } };
    case "file-too-large":
      return { key: "toast.psdFileTooLarge", vars: {
        mebibytes: PSD_IMPORT_LIMITS.maximumFileBytes / 1024 / 1024,
      } };
    case "too-many-nodes":
      return { key: "toast.psdTooManyLayers", vars: {
        nodes: PSD_IMPORT_LIMITS.maximumNodes,
      } };
    case "unsupported-depth":
    case "unsupported-version":
      return { key: "toast.psdUnsupported" };
    default:
      return { key: "toast.documentOpenFailed" };
  }
}
