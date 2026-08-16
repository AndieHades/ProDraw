import type { BrushPreset } from "../contracts/brush";

interface BrushProfile {
  readonly name: string;
  readonly spacing: number;
  readonly scatter: number;
  readonly hardness: number;
  readonly flow: number;
  readonly texture: number;
}

const urls = import.meta.glob("../app-folders/brushes/main/*.brush", {
  eager: true, import: "default", query: "?url"
}) as Record<string, string>;

const profiles: Readonly<Record<string, BrushProfile>> = Object.freeze({
  "base_color.brush": { name: "Base Color", spacing: 0.12, scatter: 0,
    hardness: 0.82, flow: 1, texture: 0 },
  "big_soft_brush.brush": { name: "Big Soft Brush", spacing: 0.08, scatter: 0,
    hardness: 0.05, flow: 0.22, texture: 0 },
  "freckles.brush": { name: "Freckles", spacing: 0.55, scatter: 0.72,
    hardness: 0.7, flow: 0.7, texture: 0.35 },
  "gundersen.brush": { name: "Gundersen", spacing: 0.18, scatter: 0.08,
    hardness: 0.45, flow: 0.75, texture: 0.38 },
  "lineart_long.brush": { name: "Lineart Long", spacing: 0.08, scatter: 0,
    hardness: 0.88, flow: 1, texture: 0 },
  "lineart.brush": { name: "Lineart", spacing: 0.1, scatter: 0,
    hardness: 0.92, flow: 1, texture: 0 },
  "net_screentone.brush": { name: "Net Screentone", spacing: 0.15, scatter: 0,
    hardness: 0.7, flow: 0.85, texture: 0.85 },
  "pencil_waxy.brush": { name: "Pencil Waxy", spacing: 0.12, scatter: 0.03,
    hardness: 0.5, flow: 0.7, texture: 0.42 },
  "screentone.brush": { name: "Screentone", spacing: 0.14, scatter: 0,
    hardness: 0.68, flow: 0.82, texture: 0.78 },
  "shadow.brush": { name: "Shadow", spacing: 0.09, scatter: 0,
    hardness: 0.13, flow: 0.3, texture: 0 },
  "sketching.brush": { name: "Sketching", spacing: 0.1, scatter: 0.02,
    hardness: 0.62, flow: 0.84, texture: 0.18 },
  "texture.brush": { name: "Texture", spacing: 0.18, scatter: 0.08,
    hardness: 0.42, flow: 0.68, texture: 0.62 }
});

export const BUNDLED_BRUSHES: readonly BrushPreset[] = Object.entries(urls)
  .map(([path, sourceUrl]) => {
    const fileName = path.split("/").at(-1) ?? path;
    const profile = profiles[fileName];
    if (!profile) throw new Error(`Missing bundled brush profile: ${fileName}`);
    return { id: fileName.replace(/\.brush$/i, ""), fileName, sourceUrl, ...profile,
      dynamics: { sizeByPressure: 0.82, opacityByPressure: 0.28 } };
  }).sort((left, right) => left.name.localeCompare(right.name));
