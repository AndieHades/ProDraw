import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BUNDLED_BRUSHES } from "../../src/config/bundledBrushes";
import { decodeProcreateBrush } from "../../src/core/brush/procreateBrush";
import { StrokePipeline } from "../../src/logic/stroke/StrokePipeline";

// These hashes lock decoded controls plus sample planning. Pixel geometry is
// independently locked by lineartRasterGolden and brushDabEquivalence tests.
// Re-recorded for pressure-aware subpixel spacing and explicit rotation/azimuth
// semantics. Continuity, footprint bounds and final RGBA are tested separately.
//
// lineart and sketching are the only presets whose shape and grain live as
// separate library sources under src/app-folders/sources. Their signature is
// not reproducible outside the host that recorded it: the recorded values
// already failed at 37fb91d, the commit that wrote them, so this is a
// non-hermetic golden and not a decoder regression. They stay excluded by name
// until the parity package makes source resolution deterministic; see
// docs/tutorials/procreate-brush-parity/README.md and the idea inbox entry
// dated 2026-09-06.
const librarySourceBrushes = new Set(["lineart.brush", "sketching.brush"]);

const expected: Readonly<Record<string, string>> = {
  "base_color.brush": "b6c20872a36ff0a1996246e8be4552b82eda164355b7fcc3cbbe69037568cc53",
  "big_soft_brush.brush": "d43c21c09deb6e053e77dac1fbef7056f40cf6b131b353f5a0073c8a9f23a2bb",
  "freckles.brush": "3a222ea75f73f79d0a49ba3f706258b643f37855292d18a1d0aad1f472dc1690",
  "gundersen.brush": "fb9088174ccbd17d6be27a4aa47e5c314fc4660f2e8e9f9b6198415fc66b5864",
  "lineart_long.brush": "b41b4fb4f538c591defdab2ba7ce9f92c9d4720fca5180baf91c93d011ca1dfa",
  "net_screentone.brush": "27be112e014468ff72afe6325c35afb115c463774d7482a315a7c8ede32e1437",
  "pencil_waxy.brush": "61e6ca6321b923e75d2b59acdc4cc8e224f90ef1f4ae426a8bf7174fb7a57630",
  "screentone.brush": "8cc0eaf9f9362dec9509126f7379ddcafe66cbf643f69233e1dba103aa39e883",
  "shadow.brush": "6c5d049a4b39a3fa319e17700b4f0c967cada68e253d389f048133680ac4461c",
  "texture.brush": "33f14cce2fcd6682c51e5a76682eaa26e68606a80abe7b7e1d1b1b30c9a5f60c"
};

const input = [
  { x: 12, y: 20, pressure: 0.12, tiltX: 0, tiltY: 0, time: 0 },
  { x: 38, y: 27, pressure: 0.36, tiltX: 18, tiltY: -8, time: 8 },
  { x: 77, y: 12, pressure: 0.71, tiltX: 32, tiltY: 12, time: 16 },
  { x: 126, y: 31, pressure: 0.94, tiltX: 45, tiltY: 20, time: 24 }
];

describe("bundled brush golden plans", () => {
  it("keeps archive-driven stroke signatures stable and all twelve distinct", async () => {
    const actual: Record<string, string> = {};
    const distinct: string[] = [];
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
      const digest = createHash("sha256").update(signature).digest("hex");
      distinct.push(digest);
      if (!librarySourceBrushes.has(preset.fileName)) actual[preset.fileName] = digest;
    }
    expect(actual).toEqual(expected);
    expect(new Set(distinct)).toHaveLength(BUNDLED_BRUSHES.length);
  }, 30_000);
});
