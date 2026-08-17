import type { LocaleDictionary } from "./types.ts";
import { enShell } from "./en-shell.ts";
import { enDocument } from "./en-document.ts";
import { enMenus } from "./en-menus.ts";
import { enFeedback } from "./en-feedback.ts";
import { enPreferences } from "./en-preferences.ts";

export const en: LocaleDictionary = {
  ...enShell,
  ...enDocument,
  ...enMenus,
  ...enFeedback,
  ...enPreferences,
};
