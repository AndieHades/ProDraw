import type { PlatformPort } from "../../contracts/platform";
import type { RasterDocument } from "../../core/document/RasterDocument";
import { renderDocumentPng } from "../../core/export/renderDocumentPng";

export interface ExportSystemOptions {
  readonly platform: PlatformPort;
  readonly getDocument: () => RasterDocument;
  readonly onStatus: (message: string) => void;
}

function safeFileName(name: string): string {
  const safe = name.replace(/[<>:"/\\|?*]/g, "_").trim();
  return safe || "Untitled";
}

export class ExportSystem {
  readonly #options: ExportSystemOptions;

  constructor(options: ExportSystemOptions) {
    this.#options = options;
  }

  async exportPng(): Promise<boolean> {
    const document = this.#options.getDocument();
    this.#options.onStatus("exporting");
    try {
      const bytes = await renderDocumentPng(document);
      const saved = await this.#options.platform.saveBinary({
        suggestedName: `${safeFileName(document.descriptor.name)}.png`,
        bytes,
        filters: [{ name: "PNG", extensions: ["png"] }]
      });
      this.#options.onStatus(saved ? "exported" : "cancelled");
      return saved;
    } catch {
      this.#options.onStatus("export-failed");
      return false;
    }
  }
}
