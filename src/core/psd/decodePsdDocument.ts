import { readPsd } from "ag-psd";
import { PSD_IMPORT_LIMITS } from "../../config/psd-import.ts";
import type { PsdImportedDocument } from "../../contracts/psdImport.ts";
import { preflightPsd } from "../../logic/psd/preflightPsd.ts";
import { PsdDecodeError } from "./PsdDecodeError.ts";
import { inferPsdStackOrder } from "../../logic/psd/inferStackOrder.ts";
import { countPsdNodes, normalizePsdNodes } from "./psdNodeNormalizer.ts";
import { normalizeBitmap } from "./psdPixels.ts";
import { initializePsdImageData } from "./initializePsdImageData.ts";

function documentDpi(value: ReturnType<typeof readPsd>): number {
  const resolution = value.imageResources?.resolutionInfo;
  const source = resolution?.horizontalResolution;
  if (typeof source !== "number" || !Number.isFinite(source) || source <= 0) {
    return PSD_IMPORT_LIMITS.defaultDpi;
  }
  return resolution?.horizontalResolutionUnit === "PPCM" ? source * 2.54 : source;
}

export function decodePsdDocument(buffer: ArrayBuffer): PsdImportedDocument {
  preflightPsd(buffer);
  try {
    initializePsdImageData();
    const decoded = readPsd(buffer, { useImageData: true,
      totalMemoryLimit: PSD_IMPORT_LIMITS.maximumDecodedBytes,
      skipThumbnail: true, skipLinkedFilesData: true,
      logMissingFeatures: false, throwForMissingFeatures: false });
    const warnings: string[] = [];
    const children = normalizePsdNodes(decoded.children ?? [], warnings);
    if (countPsdNodes(children) > PSD_IMPORT_LIMITS.maximumNodes) {
      throw new PsdDecodeError("too-many-nodes", "PSD layer count exceeds limits");
    }
    const composite = normalizeBitmap(decoded.imageData);
    return { width: decoded.width, height: decoded.height, dpi: documentDpi(decoded),
      stackOrder: inferPsdStackOrder(children, composite), children,
      ...(composite ? { composite } : {}),
      warnings: [...new Set(warnings)] };
  } catch (error) {
    if (error instanceof PsdDecodeError) throw error;
    throw new PsdDecodeError("decode-failed", "PSD decoding failed", error);
  }
}
