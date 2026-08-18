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
  "base_color.brush": "d3c9d9b89ed301d88c0ac7e23f4046e28db5f8d58176ab3659db8c756bc1af0d",
  "big_soft_brush.brush": "d43c21c09deb6e053e77dac1fbef7056f40cf6b131b353f5a0073c8a9f23a2bb",
  "freckles.brush": "3a222ea75f73f79d0a49ba3f706258b643f37855292d18a1d0aad1f472dc1690",
  "gundersen.brush": "83409d6f08b45ea068a236715e79ecdb32a0ba29811eeae6bb8aabf87da33804",
  "lineart.brush": "14d563574502fc6a01f73ac327b61dbe396b507eb583629ab731567042691461",
  "lineart_long.brush": "74190b53a962a008badfad2dadd74cd7098381869d18e7ae12d4060d8bc04b1d",
  "net_screentone.brush": "27be112e014468ff72afe6325c35afb115c463774d7482a315a7c8ede32e1437",
  "pencil_waxy.brush": "61e6ca6321b923e75d2b59acdc4cc8e224f90ef1f4ae426a8bf7174fb7a57630",
  "screentone.brush": "a36b0f005160b92c837f32a7db1e71c1d31513d543386722a2d009c6c438fea1",
  "shadow.brush": "69b30137d40404ace7c45563e7176fa3a5c18893b06c3d0413c400d84445c194",
  "sketching.brush": "f867e2a3494246601462fc9319e6925d93f12ca450f9485dbbbaad39bb0a51da",
  "texture.brush": "33f14cce2fcd6682c51e5a76682eaa26e68606a80abe7b7e1d1b1b30c9a5f60c"
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
      input.forEach((sample) => pipeline.push(sample)); pipeline.finish();
      const plan = pipeline.completedPlan();
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
