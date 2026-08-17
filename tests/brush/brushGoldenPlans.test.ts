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
  "base_color.brush": "6cf8dde932f9bdd103a33f55b3fd20ca51d30ef36975bed10c0511b94f9c834c",
  "big_soft_brush.brush": "54feaf2bd8247ea6101335184ff7d25ddb1364a994193bd0937711b78a1ae3fd",
  "freckles.brush": "40d87728e873bb0f37b94fbb369eb96fdf04e632124d2c3341d524e0d597c2cf",
  "gundersen.brush": "b56b4d3783e9f7366532627824300e42a012cea0bc4f158eec7878eb5ac274e9",
  "lineart.brush": "a5b8205f6a15bf8c225b6b1dd6701db309ad7132ca44324c689c4e2a12709aaf",
  "lineart_long.brush": "2446b6baeee89d8b6fdb312be5c926c87c7e5cac70fdb8366da89c6219c4606f",
  "net_screentone.brush": "602ac015f7c44f1b7396b08f3066137accf3a7f906582730e2bb1de07c559b78",
  "pencil_waxy.brush": "728127bcbdbb900e044fac93ddf40ed143bec2da9a167b3523815672421f942c",
  "screentone.brush": "14e147eb637895acedc26fa791252d2650e4711ef94bc8cdcfe5d4f2e3ea7deb",
  "shadow.brush": "ca56b2fab7d7d09661790d1e4dc48de2f38d801d55acf316272e3890bd098f08",
  "sketching.brush": "2a05a5c1e940b3d59d5e91254873ef126a6eef62234bf9790eb209f78d60622c",
  "texture.brush": "bd190dcb4ad1f668f96f28df2608f154ce47508b977ad2e8973705c6b9c9ce11"
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
