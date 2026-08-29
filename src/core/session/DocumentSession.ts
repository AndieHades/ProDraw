export interface DocumentGenerationToken {
  readonly generation: number;
}

export interface DocumentSaveToken extends DocumentGenerationToken {
  readonly id: string;
  readonly folder: string | null;
  readonly revision: number;
}

export class DocumentSession {
  #id: string | null = null;
  #folder: string | null = null;
  #generation = 0;
  #revision = 0;
  #savedRevision: number | null = null;

  get id(): string | null { return this.#id; }
  get folder(): string | null { return this.#folder; }
  get dirty(): boolean {
    return this.#id !== null && this.#savedRevision !== this.#revision;
  }

  checkpoint(): DocumentGenerationToken {
    return { generation: this.#generation };
  }

  supersede(): DocumentGenerationToken {
    this.#generation += 1;
    return this.checkpoint();
  }

  isCurrent(token: DocumentGenerationToken): boolean {
    return token.generation === this.#generation;
  }

  activateNew(id: string, folder: string | null = null): DocumentGenerationToken {
    const token = this.supersede();
    this.activate(token, id, folder, false);
    return token;
  }

  activate(token: DocumentGenerationToken, id: string, folder: string | null,
    saved: boolean): boolean {
    if (!this.isCurrent(token)) return false;
    this.#id = id; this.#folder = folder; this.#revision = 0;
    this.#savedRevision = saved ? 0 : null;
    return true;
  }

  clear(token: DocumentGenerationToken): boolean {
    if (!this.isCurrent(token)) return false;
    this.#id = null; this.#folder = null; this.#revision = 0;
    this.#savedRevision = null;
    return true;
  }

  markDirty(): void {
    if (this.#id === null) return;
    this.#revision += 1;
  }

  captureSave(): DocumentSaveToken | null {
    if (this.#id === null) return null;
    return { id: this.#id, folder: this.#folder, generation: this.#generation,
      revision: this.#revision };
  }

  isSaveCurrent(token: DocumentSaveToken): boolean {
    return this.isCurrent(token) && token.id === this.#id &&
      token.revision === this.#revision;
  }

  markSaved(token: DocumentSaveToken): boolean {
    if (!this.isSaveCurrent(token)) return false;
    this.#savedRevision = token.revision;
    return true;
  }
}
