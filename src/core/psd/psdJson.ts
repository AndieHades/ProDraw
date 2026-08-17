import type { PsdJsonValue } from "../../contracts/psdEffects";

export function psdJsonValue(value: unknown): PsdJsonValue | undefined {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) {
    return value.map((item) => psdJsonValue(item) ?? null);
  }
  if (!value || typeof value !== "object") return undefined;
  if (ArrayBuffer.isView(value)) {
    return Array.from(value as unknown as ArrayLike<number>, (item) => item);
  }
  const output: Record<string, PsdJsonValue> = {};
  for (const [key, item] of Object.entries(value)) {
    const normalized = psdJsonValue(item);
    if (normalized !== undefined) output[key] = normalized;
  }
  return output;
}

export function psdJsonObject(
  value: unknown
): Readonly<Record<string, PsdJsonValue>> | undefined {
  const normalized = psdJsonValue(value);
  return normalized && !Array.isArray(normalized) && typeof normalized === "object"
    ? normalized as Readonly<Record<string, PsdJsonValue>> : undefined;
}
