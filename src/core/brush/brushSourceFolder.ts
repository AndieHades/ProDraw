import type { BrushSourceResolver } from "../../contracts/brushSourceResolver";
import { brushSourceAssetUrl } from "../../config/brushSourceAssets";
import { decodeCoverage } from "./decodeCoverage";

const cached = new Map<string, Promise<Awaited<ReturnType<typeof decodeCoverage>> | null>>();

export const brushSourceFolder: BrushSourceResolver = {
  resolve(request) {
    const url = brushSourceAssetUrl(request.brushId, request.kind);
    if (!url) return Promise.resolve(null);
    const key = `${url}:${request.maximumSide}:${request.inverted}`;
    const existing = cached.get(key);
    if (existing) return existing;
    const loading = fetch(url).then(async (response) => {
      if (!response.ok) throw new Error(`Brush source request failed: ${response.status}`);
      return decodeCoverage(new Uint8Array(await response.arrayBuffer()),
        request.maximumSide, { inverted: request.inverted });
    }).catch(() => null);
    cached.set(key, loading);
    return loading;
  }
};
