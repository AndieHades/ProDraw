import path from "node:path";

const WRITABLE_EXTENSIONS = new Set([".prodraw", ".psd", ".png"]);

export function writableDocumentLocation(value) {
  const location = path.resolve(String(value));
  if (!WRITABLE_EXTENSIONS.has(path.extname(location).toLowerCase())) {
    throw new Error("Existing writes require a .prodraw, .psd or .png document path");
  }
  return location;
}
