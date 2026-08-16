import type { BrushPreset } from "../../contracts/brush";
import type { BrushLibraryService } from "../../core/brush-library/BrushLibraryService";
import { requiredElement } from "../dom/query";

const transferType = "application/x-prodraw-brush-library";
type Payload = { readonly kind: "brush"; readonly value: string } |
  { readonly kind: "set"; readonly value: string };

function payload(event: DragEvent): Payload | null {
  try {
    const value = JSON.parse(event.dataTransfer?.getData(transferType) ?? "") as Payload;
    return (value.kind === "brush" || value.kind === "set") && typeof value.value === "string"
      ? value : null;
  } catch { return null; }
}

export class BrushLibraryDragPresenter {
  readonly #sets = requiredElement<HTMLElement>("#brush-set-list");
  readonly #brushes = requiredElement<HTMLElement>("#brush-list");
  readonly #library: BrushLibraryService;
  readonly #moved: (brush: BrushPreset) => void;

  constructor(library: BrushLibraryService, moved: (brush: BrushPreset) => void) {
    this.#library = library; this.#moved = moved;
    for (const root of [this.#sets, this.#brushes]) {
      root.addEventListener("dragstart", this.onStart);
      root.addEventListener("dragover", this.onOver);
      root.addEventListener("drop", (event) => void this.onDrop(event));
      root.addEventListener("dragend", () => this.clearTargets());
    }
  }

  private readonly onStart = (event: DragEvent): void => {
    const element = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-brush-id], [data-set-name]"
    );
    if (!element || !event.dataTransfer) return;
    const data: Payload = element.dataset.brushId
      ? { kind: "brush", value: element.dataset.brushId }
      : { kind: "set", value: element.dataset.setName! };
    event.dataTransfer.setData(transferType, JSON.stringify(data));
    event.dataTransfer.effectAllowed = "move";
  };

  private readonly onOver = (event: DragEvent): void => {
    if (!event.dataTransfer?.types.includes(transferType)) return;
    event.preventDefault();
    this.clearTargets();
    (event.target as HTMLElement).closest<HTMLElement>(
      "[data-brush-id], [data-set-name]"
    )?.classList.add("drop-target");
  };

  private async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    const data = payload(event);
    const target = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-brush-id], [data-set-name]"
    );
    this.clearTargets();
    if (!data) return;
    if (data.kind === "set") {
      const before = target?.dataset.setName ?? null;
      if (before !== data.value) this.#library.reorderSet(data.value, before);
      return;
    }
    const brush = this.#library.snapshot.sets.flatMap(({ brushes }) => brushes)
      .find(({ id }) => id === data.value);
    if (!brush) return;
    const targetSet = target?.dataset.setName ?? target?.dataset.brushSet ??
      this.#library.snapshot.currentSetName;
    const moved = await this.#library.move(brush, targetSet);
    const before = target?.dataset.brushId ?? null;
    if (before !== moved.id) this.#library.reorderBrush(targetSet, moved.id, before);
    this.#moved(moved);
  }

  private clearTargets(): void {
    document.querySelectorAll(".drop-target").forEach((element) =>
      element.classList.remove("drop-target"));
  }
}
