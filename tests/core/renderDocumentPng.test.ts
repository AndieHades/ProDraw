import { describe, expect, it } from "vitest";
import { RasterDocument } from "../../src/core/document/RasterDocument";
import { renderDocumentPng } from "../../src/core/export/renderDocumentPng";

describe("PNG export guards", () => {
  it("rejects an over-budget document before allocating an output canvas", async () => {
    const document = new RasterDocument({ id: "large", name: "Large",
      width: 100_000, height: 100_000, dpi: 72 });
    await expect(renderDocumentPng(document)).rejects.toThrow("pixel budget");
  });

  it("honors cancellation before allocation", async () => {
    const document = new RasterDocument({ id: "cancelled", name: "Cancelled",
      width: 10, height: 10, dpi: 72 });
    const controller = new AbortController();
    controller.abort();
    await expect(renderDocumentPng(document, { signal: controller.signal }))
      .rejects.toMatchObject({ name: "AbortError" });
  });
});
