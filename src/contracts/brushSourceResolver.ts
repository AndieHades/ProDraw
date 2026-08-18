import type { BrushSourceKind, CoverageMap } from "./brush";

export interface BrushSourceResolveRequest {
  readonly brushId: string;
  readonly kind: BrushSourceKind;
  readonly maximumSide: number;
  readonly inverted: boolean;
}

export interface BrushSourceResolver {
  resolve(request: BrushSourceResolveRequest): Promise<CoverageMap | null>;
}
