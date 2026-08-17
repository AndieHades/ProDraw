import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { decodeProcreateBrush } from "../../src/core/brush/procreateBrush";
import { StrokePipeline } from "../../src/logic/stroke/StrokePipeline";

const expected: Readonly<Record<string, string>> = {
  "base_color.brush": "f7ff7bb0bcb6e390ed4c0b6e8bdb44375edfa27a94faaa697a3eedf8cd6ba37f",
  "big_soft_brush.brush": "6641420954b4c81108670a7ca1f08c2844b4e8b770c8208156c6235a944c1a62",
  "freckles.brush": "415c8107ee3735bd365d07269c5866c43b61a01e423997fbb628c06548008f48",
  "gundersen.brush": "b907b4151a3640244c011fbd88fb054ec41c7c22aaef7e8f7f691aebac172c6f",
  "lineart.brush": "34a58755582e4526c6d70e02293aa05f58961261075f8a4371b5200172c27663",
  "lineart_long.brush": "35c6dbd2fe562497b6ddecb8eae6e8dfada151f46d6b673f7726ed6c64a976f0",
  "net_screentone.brush": "09e5d37b1311a83cd8028d51d6fcdce6360fed180fcd82150f6e3bc1c77105db",
  "pencil_waxy.brush": "726a2463cd4015a39e45993df70566264436030a291b650ec5c741aaeeae6d04",
  "screentone.brush": "354567e5bf80b892719f3a8f7449879212080bd312382d6ba014c1beac33fb7d",
  "shadow.brush": "e664f7c63f443c760881cf9fdd9174b6c747290604b2adae546b941d6c7d1f16",
  "sketching.brush": "dee9c9b66c370aea518c0c76e1b68237fce81eaf6a52518ab277bf33d160bb0b",
  "texture.brush": "4e6d50031b05342a47cc7556073f0fce61a07e46c33d51dbc58c4f4a0ab4fc72"
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
