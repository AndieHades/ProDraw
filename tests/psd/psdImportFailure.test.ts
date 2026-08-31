import { describe, expect, it } from "vitest";
import { PsdDecodeError } from "../../src/core/psd/PsdDecodeError.ts";
import { psdImportFailure } from "../../src/systems/import/psd-error.ts";

describe("PSD import failure feedback", () => {
  it("keeps bounded preflight failures specific and localized by key", () => {
    expect(psdImportFailure(new PsdDecodeError(
      "canvas-too-large", "oversized",
    ))).toMatchObject({ key: "toast.psdCanvasTooLarge",
      vars: { side: 8192, megapixels: "16.8" } });
    expect(psdImportFailure(new PsdDecodeError(
      "file-too-large", "oversized",
    ))).toMatchObject({ key: "toast.psdFileTooLarge",
      vars: { mebibytes: 512 } });
  });

  it("falls back for corrupt decoder failures without exposing internals", () => {
    expect(psdImportFailure(new Error("secret path"))).toEqual({
      key: "toast.documentOpenFailed",
    });
  });
});
