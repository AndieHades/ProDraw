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
  "base_color.brush": "342464914b5c38bb4107086e32669a8a195081d4156cf3ac99717010ff16e56d",
  "big_soft_brush.brush": "9ca5732329cca69d3e3f05864bff7b63562af76250edbec493267bfdd5b5c764",
  "freckles.brush": "415c8107ee3735bd365d07269c5866c43b61a01e423997fbb628c06548008f48",
  "gundersen.brush": "4b18ab065531ff102b23772b5c87969f64ebf5460d5974d2c5f4c675065f961f",
  "lineart.brush": "4242604714dac18044a8739197e9429cd57c55007eaa0ca8f67408d2237dce68",
  "lineart_long.brush": "8cee1edad149d22dbf069c29c9af4fb307e950d8eb7ee5ba15dea2292852a79f",
  "net_screentone.brush": "bb969f236e94790dbeaf04495bd254c55557c5dd83a68a58f91f14b13422e09c",
  "pencil_waxy.brush": "87a707f9e92344799f80eb568167e18aaa83d765cce003356deeba03519f2322",
  "screentone.brush": "ca0bf92c5342e01d116c0f53867a1bd8d79499a75fcfb2cc4e7745beadb01cbd",
  "shadow.brush": "2d9e9f85f402e1c50e5dfe5588d5c1181eb993edaa0791faee16ceabc924fff6",
  "sketching.brush": "88dd83230c887d3cf6a2642025ef2d11732e020ba56c5904089f1a315a0b68eb",
  "texture.brush": "2c6ec88d7b0e5308229d82a28baf1d56eb1729972c2f24e12603e31faaa3eff4"
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
