import type { LayerEffectsInfo } from "ag-psd";
import { describe, expect, it } from "vitest";
import { normalizePsdEffects } from "../../src/core/psd/psdEffectNormalizer";

describe("PSD effect normalization", () => {
  it("preserves every decoded effect family and reports pattern resources", () => {
    const enabled = { enabled: true, opacity: 0.25 };
    const effects: LayerEffectsInfo = { dropShadow: [enabled], innerShadow: [enabled],
      outerGlow: enabled, innerGlow: enabled, bevel: enabled,
      solidFill: [enabled], satin: enabled, stroke: [enabled],
      gradientOverlay: [enabled], patternOverlay: enabled };
    const warnings: string[] = [];
    expect(normalizePsdEffects(effects, warnings).map(({ kind }) => kind)).toEqual([
      "dropShadow", "innerShadow", "outerGlow", "innerGlow", "bevel",
      "solidFill", "satin", "stroke", "gradientOverlay", "patternOverlay",
    ]);
    expect(warnings).toEqual(["effect.patternOverlay.resource"]);
  });

  it("disables all members when Photoshop disables the effect stack", () => {
    const effects: LayerEffectsInfo = { disabled: true,
      dropShadow: [{ enabled: true, opacity: 0.7 }] };
    expect(normalizePsdEffects(effects, [])[0]).toMatchObject({
      kind: "dropShadow", enabled: false, opacity: 0.7,
    });
  });
});
