import type { RasterDocument } from "../../core/document/RasterDocument";
import { requiredElement } from "../dom/query";

export interface LayerPresenterActions {
  readonly select: (id: string) => void;
  readonly toggleVisible: (id: string, visible: boolean) => void;
}

export class LayerPresenter {
  readonly #host = requiredElement<HTMLDivElement>("#layer-list");

  render(document: RasterDocument, actions: LayerPresenterActions): void {
    const activeId = document.snapshot().activeLayerId;
    const rows = [...document.layers].reverse().map((layer) => {
      const row = documentElement("button", "layer-row");
      row.type = "button";
      row.classList.toggle("selected", layer.descriptor.id === activeId);
      const visibility = documentElement("span", "layer-visibility");
      visibility.textContent = layer.descriptor.visible ? "●" : "○";
      const name = documentElement("span", "layer-name");
      name.textContent = layer.descriptor.name;
      row.append(visibility, name);
      row.addEventListener("click", () => actions.select(layer.descriptor.id));
      visibility.addEventListener("click", (event) => {
        event.stopPropagation();
        actions.toggleVisible(layer.descriptor.id, !layer.descriptor.visible);
      });
      return row;
    });
    this.#host.replaceChildren(...rows);
  }
}

function documentElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.className = className;
  return element;
}
