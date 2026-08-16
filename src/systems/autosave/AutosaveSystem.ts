import { PERSISTENCE } from "../../config/persistence";
import type { AutosaveStatus, DocumentSessionSnapshot } from "../../contracts/persistence";
import type { RasterDocument } from "../../core/document/RasterDocument";
import type { DocumentRepository } from "../../core/persistence/DocumentRepository";
import { serializeDocument } from "../../core/persistence/documentSerialization";

const fallbackSession = (): DocumentSessionSnapshot => ({
  revision: Date.now(), savedRevision: 0, nativeLocation: null
});

export class AutosaveSystem {
  readonly #repository: DocumentRepository;
  readonly #getDocument: () => RasterDocument;
  readonly #getSession: () => DocumentSessionSnapshot;
  readonly #onStatus: (status: AutosaveStatus) => void;
  #timer: ReturnType<typeof setTimeout> | null = null;
  #requested = false;
  #draining: Promise<void> | null = null;

  constructor(repository: DocumentRepository, getDocument: () => RasterDocument,
    onStatus: (status: AutosaveStatus) => void = () => undefined,
    getSession: () => DocumentSessionSnapshot = fallbackSession) {
    this.#repository = repository;
    this.#getDocument = getDocument;
    this.#getSession = getSession;
    this.#onStatus = onStatus;
  }

  schedule(): void {
    this.#requested = true;
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      this.#timer = null;
      void this.flush().catch(() => undefined);
    }, PERSISTENCE.autosaveDelayMs);
  }

  flush(): Promise<void> {
    if (this.#timer) {
      clearTimeout(this.#timer);
      this.#timer = null;
    }
    this.#requested = true;
    if (!this.#draining) {
      const drain = this.drain();
      this.#draining = drain.finally(() => { this.#draining = null; });
    }
    return this.#draining;
  }

  private async drain(): Promise<void> {
    this.#onStatus("saving");
    try {
      while (this.#requested) {
        this.#requested = false;
        await this.#repository.saveRecovery(
          serializeDocument(this.#getDocument()), this.#getSession()
        );
      }
      this.#onStatus("saved");
    } catch (error) {
      this.#onStatus("save-failed");
      throw error;
    }
  }
}
