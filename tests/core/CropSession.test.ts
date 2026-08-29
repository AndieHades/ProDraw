import { describe, expect, it } from "vitest";
import { appliedCropRect, createCropMode, cropChangesDocument,
  placeCropSize } from "../../src/systems/crop/CropSession";

describe("typed Crop session", () => {
  it("starts from selection and keeps numeric resize centred", () => {
    const crop = createCropMode(100, 80, { x0: 10, y0: 20, x1: 29, y1: 39 });
    expect(placeCropSize(crop, 10, 6)).toBe(true);
    expect(crop).toMatchObject({ x0: 15, y0: 27, x1: 24, y1: 32 });
  });

  it("applies image offset without discarding off-canvas source pixels", () => {
    const crop = createCropMode(20, 10, null); crop.idx = 4; crop.idy = -2;
    expect(appliedCropRect(crop)).toEqual({ x0: -4, y0: 2, x1: 15, y1: 11 });
    expect(cropChangesDocument(crop, 20, 10)).toBe(true);
  });
});
