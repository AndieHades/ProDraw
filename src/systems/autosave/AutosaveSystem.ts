import { PERSISTENCE } from "../../config/persistence";
import type { AutosaveStatus, DocumentSessionSnapshot } from "../../contracts/persistence";
import type { RasterDocument } from "../../core/document/RasterDocument";
import type { DocumentRepository } from "../../core/persistence/DocumentRepository";
import { DocumentSerializer } from "../../core/persistence/documentSerialization";

const fallbackSession = (): DocumentSessionSnapshot => ({
  revision: Date.now(), savedRevision: 0, nativeLocation: null
});

export class AutosaveSystem {
  readonly #repository: DocumentRepository;
  readonly #getDocument: () => RasterDocument;
  readonly #getSession: () => DocumentSessionSnapshot;
  readonly #canPersist: () => boolean;
  readonly #onStatus: (status: AutosaveStatus) => void;
  readonly #serializer = new DocumentSerializer();
  #timer: ReturnType<typeof setTimeout> | null = null;
  #requested = false;
  #draining: Promise<void> | null = null;

  constructor(repository: DocumentRepository, getDocument: () => RasterDocument,
    onStatus: (status: AutosaveStatus) => void = () => undefined,
    getSession: () => DocumentSessionSnapshot = fallbackSession,
    canPersist: () => boolean = () => true) {
    this.#repository = repository;
    this.#getDocument = getDocument;
    this.#getSession = getSession;
    this.#canPersist = canPersist;
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
        while (!this.#canPersist()) await new Promise((resolve) =>
          setTimeout(resolve, PERSISTENCE.autosaveBusyRetryMs));
        const document = this.#getDocument();
        const session = this.#getSession();
        const serialized = await this.#serializer.serializeAsync(document);
        if (!serialized || document !== this.#getDocument() ||
            session.revision !== this.#getSession().revision) {
          this.#requested = true;
          continue;
        }
        await this.#repository.saveRecovery(serialized, session);
      }
      this.#onStatus("saved");
    } catch (error) {
      this.#onStatus("save-failed");
      throw error;
    }
  }
}
