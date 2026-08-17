export type PsdEffectKind =
  "dropShadow" | "innerShadow" | "outerGlow" | "innerGlow" |
  "bevel" | "solidFill" | "satin" | "stroke" |
  "gradientOverlay" | "patternOverlay";

export type PsdJsonValue = null | boolean | number | string |
  readonly PsdJsonValue[] | { readonly [key: string]: PsdJsonValue };

export interface PsdImportedEffect {
  readonly kind: PsdEffectKind;
  readonly enabled: boolean;
  readonly opacity: number;
  readonly properties: Readonly<Record<string, PsdJsonValue>>;
}
