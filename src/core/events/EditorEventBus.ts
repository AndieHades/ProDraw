import type { EditorEvent, EditorEventListener } from "../../contracts/editorEvents";

export class EditorEventBus {
  readonly #listeners = new Set<EditorEventListener>();

  subscribe(listener: EditorEventListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  emit(event: EditorEvent): void {
    for (const listener of this.#listeners) listener(event);
  }
}
