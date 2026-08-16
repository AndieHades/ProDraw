import { PERSISTENCE } from "../../config/persistence";
import type { RasterDocument } from "../../core/document/RasterDocument";
import type { DocumentRepository } from "../../core/persistence/DocumentRepository";
import { serializeDocument } from "../../core/persistence/documentSerialization";

export class AutosaveSystem {
  readonly #repository: DocumentRepository;
  readonly #getDocument: () => RasterDocument;
  #timer: ReturnType<typeof setTimeout> | null = null;

  constructor(repository: DocumentRepository, getDocument: () => RasterDocument) {
    this.#repository = repository;
    this.#getDocument = getDocument;
  }

  schedule(): void {
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      this.#timer = null;
      void this.flush();
    }, PERSISTENCE.autosaveDelayMs);
  }

  async flush(): Promise<void> {
    if (this.#timer) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
    await this.#repository.saveCurrent(serializeDocument(this.#getDocument()));
  }
}
