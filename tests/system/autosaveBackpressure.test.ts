import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";
import type { DocumentSessionSnapshot, SerializedDocument } from
  "../../src/contracts/persistence";
import { createRasterDocument } from "../../src/core/document/createRasterDocument";
import { DocumentRepository } from "../../src/core/persistence/DocumentRepository";
import { AutosaveSystem } from "../../src/systems/autosave/AutosaveSystem";

class SlowRepository extends DocumentRepository {
  readonly revisions: number[] = [];
  readonly #releases: Array<() => void> = [];
  active = 0;
  maximumActive = 0;

  override async saveRecovery(
    _document: SerializedDocument,
    session: DocumentSessionSnapshot
  ): Promise<void> {
    this.revisions.push(session.revision);
    this.active += 1;
    this.maximumActive = Math.max(this.maximumActive, this.active);
    await new Promise<void>((resolve) => this.#releases.push(resolve));
    this.active -= 1;
  }

  release(): void {
    const release = this.#releases.shift();
    if (!release) throw new Error("No autosave write is pending");
    release();
  }
}

describe("autosave backpressure", () => {
  it("serializes writes and coalesces a newer requested revision", async () => {
    const repository = new SlowRepository(new IDBFactory());
    const document = createRasterDocument({ name: "Queue", width: 8, height: 8,
      dpi: 72, layerName: "Paint" }, (() => { let id = 0; return () => `queue-${++id}`; })());
    let revision = 1;
    const statuses: string[] = [];
    const autosave = new AutosaveSystem(repository, () => document,
      (status) => statuses.push(status),
      () => ({ revision, savedRevision: 0, nativeLocation: null }));

    const first = autosave.flush();
    await vi.waitFor(() => expect(repository.revisions).toEqual([1]));
    revision = 2;
    autosave.schedule();
    const second = autosave.flush();
    repository.release();
    await vi.waitFor(() => expect(repository.revisions).toEqual([1, 2]));
    repository.release();
    await Promise.all([first, second]);

    expect(repository.maximumActive).toBe(1);
    expect(statuses).toEqual(["saving", "saved"]);
  });

  it("waits for an active pen transaction before taking a snapshot", async () => {
    const repository = new SlowRepository(new IDBFactory());
    const document = createRasterDocument({ name: "Pen", width: 8, height: 8,
      dpi: 72, layerName: "Paint" }, (() => { let id = 0; return () => `pen-${++id}`; })());
    let drawing = true;
    const autosave = new AutosaveSystem(repository, () => document, () => undefined,
      () => ({ revision: 1, savedRevision: 0, nativeLocation: null }), () => !drawing);

    const saving = autosave.flush();
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(repository.revisions).toEqual([]);
    drawing = false;
    await vi.waitFor(() => expect(repository.revisions).toEqual([1]));
    repository.release();
    await saving;
  });
});
