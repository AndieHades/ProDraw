import type { BrushSourceKind, CoverageMap } from "../../contracts/brush";
import { builtInGrainSource } from "./builtinGrainSources";
import { builtInShapeSource } from "./builtinShapeSources";

export function builtInBrushSource(name: string | undefined,
  kind: BrushSourceKind): CoverageMap | null {
  if (!name || name === "$null") return null;
  return kind === "shape" ? builtInShapeSource(name) : builtInGrainSource(name);
}
