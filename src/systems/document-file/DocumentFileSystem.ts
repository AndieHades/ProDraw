import type { PlatformPort } from "../../contracts/platform";
import type { RasterDocument } from "../../core/document/RasterDocument";
import { decodeNativeDocument, encodeNativeDocument } from
  "../../core/persistence/nativeDocumentFile";

const filters = [{ name: "ProDraw", extensions: ["prodraw"] }] as const;

export interface OpenedDocument {
  readonly document: RasterDocument;
  readonly location: string | null;
}

export interface SavedDocument {
  readonly saved: boolean;
  readonly location: string | null;
}

function safeName(name: string): string {
  const safe = name.replace(/[<>:"/\\|?*]/g, "_").trim();
  return safe || "Untitled";
}

export class DocumentFileSystem {
  readonly #platform: PlatformPort;

  constructor(platform: PlatformPort) { this.#platform = platform; }

  async open(): Promise<OpenedDocument | null> {
    const opened = await this.#platform.openBinary(filters);
    if (!opened) return null;
    return { document: decodeNativeDocument(opened.bytes), location: opened.location };
  }

  async save(document: RasterDocument, location: string | null): Promise<SavedDocument> {
    const bytes = encodeNativeDocument(document);
    if (location) {
      try {
        if (await this.#platform.writeBinary(location, bytes)) {
          return { saved: true, location };
        }
      } catch { /* Fall through to a visible Save As dialog. */ }
    }
    return this.saveBytesAs(document, bytes);
  }

  async saveAs(document: RasterDocument): Promise<SavedDocument> {
    return this.saveBytesAs(document, encodeNativeDocument(document));
  }

  private async saveBytesAs(
    document: RasterDocument,
    bytes: Uint8Array<ArrayBuffer>
  ): Promise<SavedDocument> {
    const saved = await this.#platform.saveBinary({
      suggestedName: `${safeName(document.descriptor.name)}.prodraw`, bytes, filters
    });
    return saved ? { saved: true, location: saved.location } : { saved: false, location: null };
  }
}
