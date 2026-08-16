import { PERSISTENCE } from "../../config/persistence";
import type { AutosaveStatus } from "../../contracts/persistence";
import type { RasterDocument } from "../../core/document/RasterDocument";
import type { DocumentRepository } from "../../core/persistence/DocumentRepository";
import { serializeDocument } from "../../core/persistence/documentSerialization";

export class AutosaveSystem {
  readonly #repository: DocumentRepository;
  readonly #getDocument: () => RasterDocument;
  readonly #onStatus: (status: AutosaveStatus) => void;
  #timer: ReturnType<typeof setTimeout> | null = null;

  constructor(repository: DocumentRepository, getDocument: () => RasterDocument,
    onStatus: (status: AutosaveStatus) => void = () => undefined) {
    this.#repository = repository;
    this.#getDocument = getDocument;
    this.#onStatus = onStatus;
  }

  schedule(): void {
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      this.#timer = null;
      void this.flush().catch(() => undefined);
    }, PERSISTENCE.autosaveDelayMs);
  }

  async flush(): Promise<void> {
    if (this.#timer) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
    this.#onStatus("saving");
    try {
      await this.#repository.saveCurrent(serializeDocument(this.#getDocument()));
      this.#onStatus("saved");
    } catch (error) {
      this.#onStatus("save-failed");
      throw error;
    }
  }
}
