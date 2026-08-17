import path from "node:path";
import { fileURLToPath } from "node:url";

function developmentOrigin(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return new Set(["http:", "https:"]).has(url.protocol) ? url.origin : null;
  } catch { return null; }
}

export function isTrustedRendererUrl(candidate, options) {
  let url;
  try { url = new URL(candidate); }
  catch { return false; }
  const expectedOrigin = developmentOrigin(options.developmentUrl);
  if (expectedOrigin) return url.origin === expectedOrigin;
  if (url.protocol !== "file:") return false;
  try {
    return path.resolve(fileURLToPath(url)) === path.resolve(options.packagedEntry);
  } catch { return false; }
}
