import { TEXT_DEFAULT } from '../config/text.js';
import { normalizeTextPrefs } from '../logic/text-model.js';

const KEY = 'pxh.textPrefs';

export function loadTextPrefs() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    return normalizeTextPrefs(raw || TEXT_DEFAULT);
  } catch (e) {
    return normalizeTextPrefs(TEXT_DEFAULT);
  }
}

export function saveTextPrefs(prefs) {
  const p = normalizeTextPrefs(prefs);
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {}
  return p;
}
