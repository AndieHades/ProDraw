import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { emptyBrushCompatibility } from "../../src/core/brush/procreateBrush";
import { visitBrushDab } from "../../src/core/brush/renderBrushDab";
import { StrokePipeline } from "../../src/logic/stroke/StrokePipeline";
import type { LoadedBrush } from "../../src/contracts/brush";
import { testGrainMap, testShapeMap } from "./brushTestMaps";

const preset = BUNDLED_BRUSHES[0]!;
const shapeMap = testShapeMap;
const grainMap = testGrainMap;
const base: LoadedBrush = { ...preset, strokePath: { ...preset.strokePath, scatter: 0.08 },
  shape: { ...preset.shape, sourceName: "Brush-Pocket-Brick.png", count: 2 },
  grain: { ...preset.grain, sourceName: "Brush-Artery-Charcoal-Corse.jpg",
    strength: 0.72 }, shapeMap, nativeShapeMap: shapeMap, grainMap,
  nativeGrainMap: grainMap, compatibility: emptyBrushCompatibility(), warnings: [] };

function dabHash(brush: LoadedBrush): string {
  const rows: string[] = [];
  visitBrushDab(brush, { x: 34.25, y: 31.75, pressure: 0.42,
    tiltX: 52, tiltY: 17, time: 7, rotation: 0.63, dabIndex: 4 },
  { size: 38, opacity: 0.76, erase: false }, (x, y, opacity) => {
    rows.push(`${x},${y},${opacity.toFixed(5)}`);
  });
  return createHash("sha256").update(rows.join("|")).digest("hex");
}

function planHash(brush: LoadedBrush): string {
  const pipeline = new StrokePipeline(brush, 36);
  const points = [{ x: 5, y: 10, pressure: 0.3, tiltX: 24, tiltY: 9, time: 0 },
    { x: 65, y: 28, pressure: 0.58, tiltX: 42, tiltY: 18, time: 12 }];
  const plan = [...points.flatMap((point) => pipeline.push(point)), ...pipeline.finish()];
  return createHash("sha256").update(JSON.stringify(plan)).digest("hex");
}

describe("advanced Brush Studio controls", () => {
  it("makes every pressure taper control alter the planned stroke", () => {
    const active = { ...base, taper: { ...base.taper, start: 0.7, end: 0.5,
      pressure: 0.25, size: 0.57, opacity: 0.23, tip: 0.14,
      tipAnimation: true, linkTipSizes: false } };
    const variants = [
      ["start", { ...active.taper, start: 0.2 }], ["end", { ...active.taper, end: 1 }],
      ["pressure", { ...active.taper, pressure: 0.8 }],
      ["size", { ...active.taper, size: 0.9 }],
      ["opacity", { ...active.taper, opacity: 0.8 }], ["tip", { ...active.taper, tip: 0.8 }],
      ["animation", { ...active.taper, tipAnimation: false }]
    ] as const;
    for (const [label, taper] of variants) expect(planHash({ ...active, taper }),
      label).not.toBe(planHash(active));
    const unlinked = { ...active, taper: { ...active.taper, start: 0.1, end: 1 } };
    expect(planHash({ ...unlinked, taper: { ...unlinked.taper,
      linkTipSizes: true } })).not.toBe(planHash(unlinked));
    const touch = { ...active, taper: { ...active.taper, touchStart: 0.2,
      touchEnd: 0.9, touchSize: 0.4, touchOpacity: 0.6, touchTip: 0.8 } };
    const pipeline = new StrokePipeline(touch, 36);
    const mouse = pipeline.push({ x: 5, y: 10, pressure: 1, tiltX: 0, tiltY: 0,
      time: 0, pointerType: "mouse" })[0]!;
    expect(mouse.sizeScale).not.toBe(1);
  });

  it("makes Shape geometry, multiplicity and filtering alter pixels", () => {
    const variants: LoadedBrush[] = [
      { ...base, shape: { ...base.shape, count: 4 } },
      { ...base, shape: { ...base.shape, randomized: true } },
      { ...base, shape: { ...base.shape, flipX: true } },
      { ...base, shape: { ...base.shape, pressureRoundness: 0.8 } },
      { ...base, shape: { ...base.shape, tiltRoundness: 0.8 } },
      { ...base, shape: { ...base.shape, horizontalJitter: 0.5 } },
      { ...base, shape: { ...base.shape, verticalJitter: 0.5 } },
      { ...base, shape: { ...base.shape, filtering: "none" } }
    ];
    for (const variant of variants) expect(dabHash(variant)).not.toBe(dabHash(base));
  });

  it("makes Shape input, following and screen orientation alter planning", () => {
    const following = { ...base, shape: { ...base.shape, inputStyle: "azimuth" as const,
      rotation: 1, relativeToStroke: true } };
    expect(planHash(following)).not.toBe(planHash(base));
    expect(planHash({ ...following, properties: { ...following.properties,
      orientToScreen: true } })).not.toBe(planHash(following));
  });

  it("makes Grain behavior, geometry, depth and filtering alter pixels", () => {
    const variants: LoadedBrush[] = [
      { ...base, grain: { ...base.grain, behavior: "texturized" } },
      { ...base, grain: { ...base.grain, movement: 0.2 } },
      { ...base, grain: { ...base.grain, zoom: 2 } },
      { ...base, grain: { ...base.grain, rotation: 0.7 } },
      { ...base, grain: { ...base.grain, minimumDepth: 0.9 } },
      { ...base, grain: { ...base.grain, depthJitter: 0.8 } },
      { ...base, grain: { ...base.grain, offsetJitter: true } },
      { ...base, grain: { ...base.grain, brightness: 0.3 } },
      { ...base, grain: { ...base.grain, contrast: 0.5 } },
      { ...base, grain: { ...base.grain, filtering: "none" } }
    ];
    for (const variant of variants) expect(dabHash(variant)).not.toBe(dabHash(base));
  });

  it("makes rendering mode and opacity limits alter pixels", () => {
    const modes = ["light-glaze", "uniform-glaze", "intense-glaze", "heavy-glaze",
      "uniform-blending"] as const;
    for (const mode of modes) expect(dabHash({ ...base,
      rendering: { ...base.rendering, mode } })).not.toBe(dabHash(base));
    expect(dabHash({ ...base, properties: { ...base.properties,
      maximumOpacity: 0.2 } })).not.toBe(dabHash(base));
    expect(dabHash({ ...base, properties: { ...base.properties,
      minimumOpacity: 0.95 } })).not.toBe(dabHash(base));
  });
});
