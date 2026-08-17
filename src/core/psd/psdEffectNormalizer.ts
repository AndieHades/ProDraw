import type { LayerEffectsInfo } from "ag-psd";
import type { PsdEffectKind, PsdImportedEffect } from "../../contracts/psdEffects";
import { psdJsonObject } from "./psdJson";

type EffectRecord = Readonly<Record<string, unknown>>;
type EffectSource = EffectRecord | readonly EffectRecord[] | undefined;

const sources = (value: EffectSource): readonly EffectRecord[] =>
  value ? (Array.isArray(value) ? value as readonly EffectRecord[] :
    [value as EffectRecord]) : [];

const opacity = (value: unknown): number => typeof value === "number"
  ? Math.max(0, Math.min(1, value)) : 1;

function normalizeOne(
  kind: PsdEffectKind, source: EffectRecord, disabled: boolean
): PsdImportedEffect {
  return { kind, enabled: !disabled && source.enabled !== false,
    opacity: opacity(source.opacity), properties: psdJsonObject(source) ?? {} };
}

export function normalizePsdEffects(
  effects: LayerEffectsInfo | undefined, warnings: string[]
): readonly PsdImportedEffect[] {
  if (!effects) return [];
  const output: PsdImportedEffect[] = [];
  const add = (kind: PsdEffectKind, value: EffectSource): void => {
    for (const source of sources(value)) {
      if (!Object.keys(source).length || source.present === false) continue;
      output.push(normalizeOne(kind, source, effects.disabled === true));
    }
  };
  add("dropShadow", effects.dropShadow as EffectSource);
  add("innerShadow", effects.innerShadow as EffectSource);
  add("outerGlow", effects.outerGlow as EffectSource);
  add("innerGlow", effects.innerGlow as EffectSource);
  add("bevel", effects.bevel as EffectSource);
  add("solidFill", effects.solidFill as EffectSource);
  add("satin", effects.satin as EffectSource);
  add("stroke", effects.stroke as EffectSource);
  add("gradientOverlay", effects.gradientOverlay as EffectSource);
  add("patternOverlay", effects.patternOverlay as EffectSource);
  if (output.some((effect) => effect.kind === "patternOverlay" && effect.enabled)) {
    warnings.push("effect.patternOverlay.resource");
  }
  return output;
}
