import type { PsdImportedDocument } from "../../contracts/psdImport.ts";

const PSD_EXTENSION = /\.(?:psd|psb)$/i;
const PSD_MIME = new Set([
  "image/vnd.adobe.photoshop", "application/x-photoshop", "application/photoshop",
]);

export interface DecodedPsdFile {
  readonly name: string;
  readonly document: PsdImportedDocument;
}

export function psdDocumentName(fileName: string): string {
  return fileName.replace(PSD_EXTENSION, "") || "PSD";
}

export async function isPsdFile(file: File): Promise<boolean> {
  if (PSD_EXTENSION.test(file.name) || PSD_MIME.has(file.type.toLowerCase())) return true;
  if (file.size < 4) return false;
  const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  return header[0] === 56 && header[1] === 66 && header[2] === 80 && header[3] === 83;
}

export async function decodePsdFile(file: File): Promise<DecodedPsdFile> {
  const { decodePsdDocument } = await import("../../core/psd/decodePsdDocument.ts");
  return { name: psdDocumentName(file.name),
    document: decodePsdDocument(await file.arrayBuffer()) };
}
