import type { EditorCommandDispatch } from "../../contracts/editorCommands";
import type { LayerListViewModel } from "../../contracts/editorView";
import { requiredElement } from "../dom/query";

export class LayerPresenter {
  readonly #host = requiredElement<HTMLDivElement>("#layer-list");

  render(model: LayerListViewModel, dispatch: EditorCommandDispatch): void {
    const rows = [...model.layers].reverse().map((layer) => {
      const row = documentElement("button", "layer-row");
      row.type = "button";
      row.classList.toggle("selected", layer.id === model.activeLayerId);
      const visibility = documentElement("span", "layer-visibility");
      visibility.textContent = layer.visible ? "●" : "○";
      const name = documentElement("span", "layer-name");
      name.textContent = layer.name;
      row.append(visibility, name);
      row.addEventListener("click", () => dispatch({ type: "layer.select", id: layer.id }));
      visibility.addEventListener("click", (event) => {
        event.stopPropagation();
        dispatch({ type: "layer.visibility", id: layer.id, visible: !layer.visible });
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
