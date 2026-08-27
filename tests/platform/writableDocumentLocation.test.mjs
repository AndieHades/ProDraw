import path from "node:path";
import { describe, expect, it } from "vitest";
import { writableDocumentLocation } from
  "../../desktop/writable-document-location.mjs";

describe("existing document write allowlist", () => {
  it("accepts PNG and layered document paths only", () => {
    for (const name of ["work.png", "work.PSD", "work.prodraw"]) {
      expect(writableDocumentLocation(name)).toBe(path.resolve(name));
    }
    expect(() => writableDocumentLocation("work.jpg")).toThrow(/\.png/);
  });
});
