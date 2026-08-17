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
  "base_color.brush": "6719bc450bbe01fba6a673bb2d531ffc684b5f74c6b523a76498e80139df1d1d",
  "big_soft_brush.brush": "47a1d19e6e17b31497af719632a9b07547fefc044144a22608871efc2b4d6fc2",
  "freckles.brush": "415c8107ee3735bd365d07269c5866c43b61a01e423997fbb628c06548008f48",
  "gundersen.brush": "4b18ab065531ff102b23772b5c87969f64ebf5460d5974d2c5f4c675065f961f",
  "lineart.brush": "342a27a5574b790ef396574a4266b67ae0b8dfddd64955b0ae6e652b9bda3613",
  "lineart_long.brush": "f1d3dadf842814e4197c7f8896d39c18176184542b95ab03c7ce6af517556fe9",
  "net_screentone.brush": "bb969f236e94790dbeaf04495bd254c55557c5dd83a68a58f91f14b13422e09c",
  "pencil_waxy.brush": "87a707f9e92344799f80eb568167e18aaa83d765cce003356deeba03519f2322",
  "screentone.brush": "ca0bf92c5342e01d116c0f53867a1bd8d79499a75fcfb2cc4e7745beadb01cbd",
  "shadow.brush": "d015288df28f180bdb97d8f4a010c51f722d30f9a69179bbba59af0b1f6aeb4e",
  "sketching.brush": "2818e5db0e620270bf6193dc5daac735e542b24ed36e9cee2fa42aa8f3b57b4f",
  "texture.brush": "24e6724c63bbf61f2428d2bd078f92e7f65106373070b6c20f429c07ec1df87d"
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
