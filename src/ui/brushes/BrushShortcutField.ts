import { keyboardCombo } from "../../logic/key-code";

export interface BrushShortcutPort {
  read(brushId: string): string;
  write(brushId: string, combo: string | null): Promise<void>;
}

export const noBrushShortcuts: BrushShortcutPort = {
  read: () => "", write: async () => undefined
};

export class BrushShortcutField {
  readonly #input: HTMLInputElement;
  #value = "";

  constructor(input: HTMLInputElement) {
    this.#input = input;
    input.addEventListener("keydown", (event) => this.capture(event));
  }

  get value(): string { return this.#value; }

  set(value: string): void {
    this.#value = value;
    this.#input.value = value;
  }

  private capture(event: KeyboardEvent): void {
    event.preventDefault(); event.stopPropagation();
    if (["Escape", "Delete", "Backspace"].includes(event.code)) {
      this.set(""); return;
    }
    const combo = keyboardCombo(event);
    if (combo && combo !== "space") this.set(combo);
  }
}
