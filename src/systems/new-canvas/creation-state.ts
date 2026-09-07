import { $ } from "../../core/shell.ts";

let creating = false;

export const isCreatingCanvas = (): boolean => creating;

export function setCreatingCanvas(on: boolean): void {
  creating = on;
  const panel = $("new-ovl")?.querySelector(".new-panel");
  panel?.setAttribute("aria-busy", String(on));
  const create = $("new-create");
  if (create instanceof HTMLButtonElement) create.disabled = on;
  panel?.querySelectorAll(".new-row").forEach((element) => {
    if ("disabled" in element) (element as { disabled: boolean }).disabled = on;
    element.classList.toggle("disabled", on);
  });
}
