import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { decodeProcreateBrush } from "../../src/core/brush/procreateBrush";
import { StrokePipeline } from "../../src/logic/stroke/StrokePipeline";

// These hashes lock decoded controls plus sample planning. Pixel geometry is
// independently locked by lineartRasterGolden and brushDabEquivalence tests.
const expected: Readonly<Record<string, string>> = {
  "base_color.brush": "db351be2f960d008a6e0bdd293e5999e968dec63a40d9295c6fcf26fe50c295b",
  "big_soft_brush.brush": "43a4db832fcdd66d5eb0116899ac727ee62aebeaf8aad261aa2ca5900d46bd0d",
  "freckles.brush": "ec9ccf604aac76ecac59af9b5fb2082962de9c87826e3ab189515686a18795ff",
  "gundersen.brush": "0286a6497abe431fc5fdde6542ab0136e0d76fa5b4911c78427b727c8be29eb4",
  "lineart.brush": "994db1872ddc28d04ed463de46a37effa9bdbd451ec402aa3b82cd71a7659d29",
  "lineart_long.brush": "5b72d3deb31fef54a8dbd34f2dcc45b68e1a5f8d1f31f0f69d2e7ac495e62abb",
  "net_screentone.brush": "353642c488a215b8ea06c356c9a9f6852b3eb8331d5ac5c32c1e0e37b2aebcd6",
  "pencil_waxy.brush": "4169d767d8dee4b6dbe0105c0a31047a9292399c1c42d73c2f9c2c4ff82d108f",
  "screentone.brush": "bb2b125f8ecd09c9a9d230cb34e02b6068eb4e56ea3a7069ceb163083fc6c269",
  "shadow.brush": "3d7798fe74f43bbdb7f670414cb14efba71590805bf14644fd4365148e70d307",
  "sketching.brush": "eee1e9219945d5a4882ff0ad1f6d924c120332de6d4e2c6d797ec95b465bf0f2",
  "texture.brush": "7aa702eed29e59be12682e4cda5c02346ad4ccbdf67538eb8e1a7c88e22931dd"
};

const input = [
  { x: 12, y: 20, pressure: 0.12, tiltX: 0, tiltY: 0, time: 0 },
  { x: 38, y: 27, pressure: 0.36, tiltX: 18, tiltY: -8, time: 8 },
  { x: 77, y: 12, pressure: 0.71, tiltX: 32, tiltY: 12, time: 16 },
  { x: 126, y: 31, pressure: 0.94, tiltX: 45, tiltY: 20, time: 24 }
];

describe("bundled brush golden plans", () => {
  it("keeps all twelve archive-driven stroke signatures stable and distinct", async () => {
    const actual: Record<string, string> = {};
    for (const preset of BUNDLED_BRUSHES) {
      const source = await readFile(path.join(process.cwd(), "src", "app-folders",
        "brushes", "main", preset.fileName));
      const loaded = await decodeProcreateBrush(new Uint8Array(source.buffer.slice(
        source.byteOffset, source.byteOffset + source.byteLength)), preset);
      const pipeline = new StrokePipeline(loaded, 31);
      const plan = [...input.flatMap((sample) => pipeline.push(sample)), ...pipeline.finish()];
      const signature = JSON.stringify({ strokePath: loaded.strokePath,
        stabilization: loaded.stabilization, taper: loaded.taper, shape: loaded.shape,
        grain: loaded.grain, rendering: loaded.rendering, dynamics: loaded.dynamics,
        properties: loaded.properties, plan });
      actual[preset.fileName] = createHash("sha256").update(signature).digest("hex");
    }
    expect(actual).toEqual(expected);
    expect(new Set(Object.values(actual))).toHaveLength(BUNDLED_BRUSHES.length);
  }, 30_000);
});
