import type { BrushSourceKind } from "../contracts/brush";

const urls = import.meta.glob("../app-folders/sources/{shape,grain}/*.png", {
  eager: true, import: "default", query: "?url"
}) as Record<string, string>;

const aliases: Readonly<Record<string, string>> = {
  "lineart_long:shape": "lineart",
  "lineart_long:grain": "lineart"
};

const indexed = new Map<string, string>();
for (const [path, url] of Object.entries(urls)) {
  const match = path.replace(/\\/g, "/").match(/\/(shape|grain)\/([^/]+)\.png$/i);
  if (match) indexed.set(`${match[2]!.toLowerCase()}:${match[1]!.toLowerCase()}`, url);
}

export function brushSourceAssetUrl(brushId: string,
  kind: BrushSourceKind): string | null {
  const key = `${brushId.toLowerCase()}:${kind}`;
  const resolvedId = aliases[key] ?? brushId.toLowerCase();
  return indexed.get(`${resolvedId}:${kind}`) ?? null;
}

export const BRUSH_SOURCE_ASSET_COUNT = indexed.size;
