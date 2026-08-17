import type { BrushPreset } from "../contracts/brush";
import { SMUDGE_DEFAULTS } from "./smudge";

type Profile = readonly [name: string, spacing: number, scatter: number,
  hardness: number, flow: number, texture: number];

const urls = import.meta.glob("../app-folders/brushes/main/*.brush", {
  eager: true, import: "default", query: "?url"
}) as Record<string, string>;

const profiles: Readonly<Record<string, Profile>> = Object.freeze({
  "base_color.brush": ["Base Color", 0.12, 0, 0.82, 1, 0],
  "big_soft_brush.brush": ["Big Soft Brush", 0.08, 0, 0.05, 0.22, 0],
  "freckles.brush": ["Freckles", 0.55, 0.72, 0.7, 0.7, 0.35],
  "gundersen.brush": ["Gundersen", 0.18, 0.08, 0.45, 0.75, 0.38],
  "lineart_long.brush": ["Lineart Long", 0.08, 0, 0.88, 1, 0],
  "lineart.brush": ["Lineart", 0.1, 0, 0.92, 1, 0],
  "net_screentone.brush": ["Net Screentone", 0.15, 0, 0.7, 0.85, 0.85],
  "pencil_waxy.brush": ["Pencil Waxy", 0.12, 0.03, 0.5, 0.7, 0.42],
  "screentone.brush": ["Screentone", 0.14, 0, 0.68, 0.82, 0.78],
  "shadow.brush": ["Shadow", 0.09, 0, 0.13, 0.3, 0],
  "sketching.brush": ["Sketching", 0.1, 0.02, 0.62, 0.84, 0.18],
  "texture.brush": ["Texture", 0.18, 0.08, 0.42, 0.68, 0.62]
});

function preset(fileName: string, sourceUrl: string, profile: Profile): BrushPreset {
  const [name, spacing, scatter, hardness, flow, texture] = profile;
  return { format: "prodraw-brush", version: 1, revision: 1,
    id: fileName.replace(/\.brush$/i, ""), name, setName: "Main", fileName,
    baseFileName: fileName, replacesFileName: null, sourceUrl,
    strokePath: { spacing, spacingJitter: 0, lateralJitter: 0,
      linearJitter: 0, fallOff: 0, scatter },
    stabilization: { streamlineAmount: 0.45, streamlinePressure: 0,
      stabilizationAmount: 0.06, motionFilteringAmount: 0,
      motionFilteringExpression: 0 },
    taper: { start: 0, end: 0, pressure: 0 },
    shape: { hardness, angle: 0, roundness: 1 },
    grain: { strength: texture, scale: 1 },
    rendering: { flow, opacity: 1 },
    dynamics: { sizeByPressure: 0.82, opacityByPressure: 0.28, tiltToSize: 0 },
    smudge: { ...SMUDGE_DEFAULTS },
    stylus: { minimumPressure: 0.01, pressureCurve: [0, 0.33, 0.67, 1],
      tiltEnabled: true, barrelAction: "eraser", eraserAction: "eraser" },
    properties: { maximumSize: 500, minimumSize: 1 },
    sources: { shape: null, grain: null } };
}

export const BUNDLED_BRUSHES: readonly BrushPreset[] = Object.entries(urls)
  .map(([path, sourceUrl]) => {
    const fileName = path.split("/").at(-1) ?? path;
    const profile = profiles[fileName];
    if (!profile) throw new Error(`Missing bundled brush profile: ${fileName}`);
    return preset(fileName, sourceUrl, profile);
  }).sort((left, right) => left.name.localeCompare(right.name));
