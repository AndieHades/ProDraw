import { TEXT_DEFAULT } from "../config/text.ts";
import { normalizeTextPrefs } from "../logic/text-model.ts";

const KEY = "pxh.textPrefs";

export function loadTextPrefs(): ReturnType<typeof normalizeTextPrefs> {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return normalizeTextPrefs(raw || TEXT_DEFAULT);
  } catch {
    return normalizeTextPrefs(TEXT_DEFAULT);
  }
}

export function saveTextPrefs(
  prefs: unknown
): ReturnType<typeof normalizeTextPrefs> {
  const p = normalizeTextPrefs(prefs);
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage full */ }
  return p;
}
