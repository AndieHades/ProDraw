import { describe, expect, it } from "vitest";
import { decodePsdFile, isPsdFile, psdDocumentName } from
  "../../src/systems/import/psd-file";
import { structuredPsd } from "./psdFixture";

describe("PSD file recognition", () => {
  it("recognizes extension, vendor MIME and header-only files", async () => {
    const bytes = structuredPsd();
    expect(await isPsdFile(new File([bytes], "art.psd"))).toBe(true);
    expect(await isPsdFile(new File([bytes], "art.bin",
      { type: "image/vnd.adobe.photoshop" }))).toBe(true);
    expect(await isPsdFile(new File([bytes], "art.bin"))).toBe(true);
    expect(await isPsdFile(new File([new Uint8Array([1, 2, 3, 4])], "art.bin")))
      .toBe(false);
  });

  it("decodes the file and strips only PSD/PSB suffixes", async () => {
    const decoded = await decodePsdFile(new File([structuredPsd()], "work.PSD"));
    expect(decoded.name).toBe("work");
    expect(decoded.document).toMatchObject({ width: 3, height: 2, dpi: 300 });
    expect(psdDocumentName("work.png")).toBe("work.png");
  });
});
