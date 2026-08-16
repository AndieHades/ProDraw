import { PERSISTENCE } from "../config/persistence";
import type { NewDocumentRequest } from "../contracts/editorCommands";
import type { PlatformPort } from "../contracts/platform";
import type { RasterSize } from "../contracts/raster";
import type { DocumentRepository } from "../core/persistence/DocumentRepository";
import { t, type MessageKey } from "../i18n/raster/translate";
import { AutosaveSystem } from "../systems/autosave/AutosaveSystem";
import { DocumentFileSystem } from "../systems/document-file/DocumentFileSystem";
import type { RasterEditorSession } from "./RasterEditorSession";

interface DocumentWorkflowOptions {
  readonly platform: PlatformPort;
  readonly repository: DocumentRepository;
  readonly session: RasterEditorSession;
  readonly viewport: () => RasterSize;
  readonly onChanged: () => void;
  readonly onStatus: (key: MessageKey) => void;
}

export class DocumentWorkflow {
  readonly #options: DocumentWorkflowOptions;
  readonly #autosave: AutosaveSystem;
  readonly #files: DocumentFileSystem;

  constructor(options: DocumentWorkflowOptions) {
    this.#options = options;
    this.#files = new DocumentFileSystem(options.platform);
    this.#autosave = new AutosaveSystem(options.repository,
      () => options.session.document,
      (status) => options.onStatus(`status.${status}` as MessageKey),
      () => options.session.sessionSnapshot);
    if (options.platform.kind === "windows") {
      options.platform.onCloseRequested(() => this.closeRequested());
    }
  }

  async requestNew(openDialog: () => void): Promise<void> {
    if (!await this.canReplace()) return;
    if (!await this.flushRecovery()) return;
    openDialog();
  }

  create(request: NewDocumentRequest, layerName: string): void {
    this.#options.session.createDocument(request, layerName, this.#options.viewport());
    this.sessionChanged();
  }

  async open(): Promise<void> {
    if (!await this.canReplace() || !await this.flushRecovery()) return;
    try {
      const opened = await this.#files.open();
      if (!opened) return;
      this.#options.session.replaceDocument(opened.document, this.#options.viewport(),
        { revision: 0, savedRevision: 0, nativeLocation: opened.location });
      this.#autosave.schedule();
      this.#options.onChanged();
      this.#options.onStatus("status.opened");
    } catch {
      this.#options.onStatus("status.open-failed");
    }
  }

  async save(forceDialog = false): Promise<boolean> {
    const session = this.#options.session;
    try {
      const result = forceDialog ? await this.#files.saveAs(session.document) :
        await this.#files.save(session.document, session.sessionSnapshot.nativeLocation);
      if (!result.saved) return false;
      session.markNativeSaved(result.location);
      this.#autosave.schedule();
      this.#options.onChanged();
      this.#options.onStatus("status.nativeSaved");
      return true;
    } catch {
      this.#options.onStatus("status.save-failed");
      return false;
    }
  }

  documentChanged(): void {
    this.#options.session.markDocumentChanged();
    this.sessionChanged();
  }

  sessionChanged(): void {
    this.#autosave.schedule();
    this.#options.onChanged();
  }

  private async canReplace(): Promise<boolean> {
    if (!this.#options.session.isDirty) return true;
    return this.#options.platform.confirmDiscard({
      title: t("confirm.unsavedTitle"), message: t("confirm.unsavedMessage"),
      confirmLabel: t("action.continue"), cancelLabel: t("action.cancel")
    });
  }

  private async closeRequested(): Promise<boolean> {
    if (!await this.canReplace()) return false;
    return this.flushRecovery();
  }

  private async flushRecovery(): Promise<boolean> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<false>((resolve) => {
      timer = setTimeout(() => resolve(false), PERSISTENCE.closeFlushTimeoutMs);
    });
    const saved = this.#autosave.flush().then(() => true as const, () => false as const);
    const result = await Promise.race([saved, timeout]);
    if (timer) clearTimeout(timer);
    if (!result) this.#options.onStatus("status.save-failed");
    return result;
  }
}
