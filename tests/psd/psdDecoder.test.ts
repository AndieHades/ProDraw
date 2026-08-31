import { describe, expect, it } from "vitest";
import { PSD_IMPORT_LIMITS } from "../../src/config/psd-import";
import { MAX_SIZE } from "../../src/config/limits.ts";
import { decodePsdDocument } from "../../src/core/psd/decodePsdDocument";
import { PsdDecodeError } from "../../src/core/psd/PsdDecodeError";
import { preflightPsd } from "../../src/logic/psd/preflightPsd";
import { paddedLayerPsd, psdHeader, structuredPsd } from "./psdFixture";

describe("PSD preflight", () => {
  it("reads the allocation-relevant header", () => {
    expect(preflightPsd(psdHeader(800, 600))).toMatchObject({
      version: 1, channels: 4, width: 800, height: 600, depth: 8, colorMode: 3,
    });
  });

  it("accepts a wide PSD canvas while its total pixel budget stays bounded", () => {
    expect(preflightPsd(psdHeader(4539, 2553))).toMatchObject({
      width: 4539, height: 2553,
    });
    expect(4539).toBeGreaterThan(MAX_SIZE);
  });

  it("rejects invalid signature, depth and canvas limits", () => {
    expect(() => preflightPsd(new ArrayBuffer(26))).toThrowError(PsdDecodeError);
    try { preflightPsd(psdHeader(8, 8, 12)); } catch (error) {
      expect(error).toMatchObject({ code: "unsupported-depth" });
    }
    try { preflightPsd(psdHeader(PSD_IMPORT_LIMITS.maximumDimension + 1, 1)); }
    catch (error) { expect(error).toMatchObject({ code: "canvas-too-large" }); }
  });
});

describe.each([false, true])("structured PSD decode (compress=%s)", (compress) => {
  it("keeps groups, alpha, masks, locks, blend metadata and effects", () => {
    const decoded = decodePsdDocument(structuredPsd(compress));
    expect(decoded).toMatchObject({ width: 3, height: 2, dpi: 300,
      stackOrder: "top-first", warnings: [] });
    const group = decoded.children[0];
    expect(group).toMatchObject({ kind: "group", name: "Group Ю", opened: false,
      blendMode: "pass through" });
    if (!group || group.kind !== "group") throw new Error("missing group");
    expect(group.opacity).toBeCloseTo(0.75, 2);
    const layer = group.children[0];
    expect(layer).toMatchObject({ kind: "layer", name: "Masked α", visible: false,
      blendMode: "multiply", clipping: true,
      locked: true, alphaLocked: true });
    if (!layer || layer.kind !== "layer" || !layer.bitmap) throw new Error("missing layer");
    expect(layer.opacity).toBeCloseTo(0.5, 2);
    expect([...layer.bitmap.rgba.filter((_, index) => index % 4 === 3)])
      .toEqual([1, 128, 254, 255]);
    expect(layer.masks[0]).toMatchObject({ source: "user", left: 1, top: 0,
      defaultAlpha: 255, feather: 1.25 });
    expect(layer.masks[0]!.density).toBeCloseTo(0.5, 2);
    expect([...layer.masks[0]!.alpha]).toEqual([0, 64, 128, 255]);
    expect(layer.effects.map(({ kind }) => kind)).toEqual(["dropShadow", "solidFill"]);
    expect(layer.effects[0]).toMatchObject({ enabled: true });
    expect(layer.effects[0]!.opacity).toBeCloseTo(0.6, 2);
  });
});

describe("bounded PSD bitmap decode", () => {
  it("trims transparent full-canvas layer padding without moving content", () => {
    const decoded = decodePsdDocument(paddedLayerPsd());
    const layer = decoded.children[0];
    expect(layer).toMatchObject({ kind: "layer", bitmap: {
      left: 6, top: 5, width: 1, height: 1,
    } });
    if (!layer || layer.kind !== "layer" || !layer.bitmap) {
      throw new Error("missing padded layer");
    }
    expect([...layer.bitmap.rgba]).toEqual([12, 34, 56, 128]);
  });
});
