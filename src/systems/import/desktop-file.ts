import type { FileFilter } from "../../contracts/platform.ts";

export const PSD_FILTERS: readonly FileFilter[] = [
  { name: "Photoshop PSD", extensions: ["psd", "psb"] }
];
export const IMPORT_FILTERS: readonly FileFilter[] = [...PSD_FILTERS,
  { name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp", "bmp", "avif"] }];
const mime = (name: string): string => {
  const extension = name.split(".").pop()?.toLowerCase();
  if (extension === "psd" || extension === "psb") return "image/vnd.adobe.photoshop";
  return extension === "jpg" ? "image/jpeg" : extension ? `image/${extension}` : "";
};
export async function openDesktopFile(filters: readonly FileFilter[] = PSD_FILTERS):
Promise<{ file: File; location: string } | null | undefined> {
  const bridge = typeof window === "undefined" ? undefined : window.prodrawDesktop;
  if (!bridge) return undefined;
  const opened = await bridge.openBinary(filters); if (!opened) return null;
  return { file: new File([opened.bytes], opened.name, { type: mime(opened.name) }),
    location: opened.location };
}
export function droppedFileLocation(file: File): string | null {
  if (typeof window === "undefined") return null;
  try { return window.prodrawDesktop?.fileLocation(file) ?? null; }
  catch { return null; }
}
