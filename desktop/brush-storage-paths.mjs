import { access } from "node:fs/promises";
import path from "node:path";
import { app } from "electron";

const allowedExtension = /\.(brush|prodraw-brush)$/i;

export function isBrushFileName(value) { return allowedExtension.test(value); }

export function safeBrushSegment(value, label) {
  const segment = String(value).trim();
  const reserved = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
  if (!segment || segment.startsWith(".") || /[<>:"/\\|?*]/.test(segment) ||
      /[. ]$/.test(segment) || reserved.test(segment) || path.basename(segment) !== segment) {
    throw new Error(`Invalid ${label}`);
  }
  return segment;
}

export function brushRoot() { return path.join(app.getPath("userData"), "brushes"); }

export function brushSetPath(name) {
  return path.join(brushRoot(), safeBrushSegment(name, "brush set name"));
}

export function brushFilePath(setName, fileName) {
  const safeFile = safeBrushSegment(fileName, "brush file name");
  if (!allowedExtension.test(safeFile)) throw new Error("Unsupported brush file extension");
  return path.join(brushSetPath(setName), safeFile);
}

export async function pathExists(target) {
  try { await access(target); return true; } catch { return false; }
}
