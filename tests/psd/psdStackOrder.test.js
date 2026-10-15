import { describe, expect, it } from "vitest";
import { writePsd } from "ag-psd";
import { decodePsdDocument } from "../../src/core/psd/decodePsdDocument.ts";
import { buildPsdGalleryRecord } from "../../src/systems/gallery/psd-record.js";
import "./psdFixture.ts";

const pixel = (rgba) => ({ width: 1, height: 1, data: new Uint8ClampedArray(rgba) });
const leaf = (name, left, rgba) => ({ name, left, top: 0, imageData: pixel(rgba) });

// Photoshop stores layer records bottom-first and ag-psd keeps that order in
// `children`. Asset sheets keep sprites apart, so the composite gives no hint.
function separatedSpritesPsd() {
  return writePsd({ width: 4, height: 1,
    imageData: { width: 4, height: 1, data: new Uint8ClampedArray(16) },
    children: [leaf("Bottom", 0, [0, 0, 255, 255]),
      { name: "Folder", opened: true, children: [
        leaf("Inner bottom", 1, [0, 255, 0, 255]),
        leaf("Inner top", 2, [255, 255, 0, 255])] },
      leaf("Top", 3, [255, 0, 0, 255])] },
  { generateThumbnail: false });
}

describe("PSD stack order", () => {
  it("keeps the Photoshop order of separated sprites and nested folders", () => {
    const document = decodePsdDocument(separatedSpritesPsd());
    const record = buildPsdGalleryRecord("order", "Order", document);
    expect(record.layers.map(({ name }) => name))
      .toEqual(["Bottom", "Inner bottom", "Inner top", "Top"]);
    expect(record.layers.map(({ fid }) => fid))
      .toEqual([null, 1, 1, null]);
  });

  it("opens every imported folder collapsed", () => {
    const document = decodePsdDocument(separatedSpritesPsd());
    const group = document.children[1];
    expect(group).toMatchObject({ kind: "group", opened: true });
    const record = buildPsdGalleryRecord("collapsed", "Collapsed", document);
    expect(record.folders).toMatchObject([{ name: "Folder", open: false }]);
  });
});
