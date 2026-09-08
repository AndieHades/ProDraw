import type { BrushPreset } from "../../contracts/brush.ts";
import type { BrushSettingsModel as SettingsModel, BrushSettingsCommands as SettingsCommands } from
  "../../contracts/liveBrushSettings.ts";
import type { BrushControlDefinition } from "../../config/brushStudioTypes.ts";
import { LIVE_BRUSH_SECTIONS } from "../../config/liveBrushControls.ts";
import { readBrushValue, type BrushScalarValue } from "../../logic/brush/brushStudioValues.ts";
import { liveBrushText as t } from "../../i18n/liveBrush.ts";
import "../../styles/live-brush-settings.css";

export function openLiveBrushSettings(model: SettingsModel, commands: SettingsCommands): void {
  document.querySelector<HTMLDialogElement>("#live-brush-settings")?.close();
  const dialog = document.createElement("dialog"); dialog.id = "live-brush-settings";
  const heading = document.createElement("h2"); heading.id = "live-brush-title";
  heading.textContent = `${t("brush.settings")} · ${model.preset.name}`;
  dialog.setAttribute("aria-labelledby", heading.id);
  const hint = document.createElement("p"); hint.textContent = t("brush.liveHint");
  const controls = document.createElement("div"); controls.className = "live-brush-controls";
  const render = (current: SettingsModel): void => {
    controls.replaceChildren(...LIVE_BRUSH_SECTIONS.map(section => {
      const group = document.createElement("details"); group.open = section.id === "strokePath";
      const title = document.createElement("summary"); title.textContent = t(section.labelKey);
      group.append(title);
      if (section.id === "grain" && !current.hasGrain) {
        const note = document.createElement("p"); note.textContent = t("brush.noGrain"); group.append(note);
      } else for (const definition of section.controls) {
        group.append(control(definition, current.preset, commands.change));
      }
      return group;
    }));
  };
  render(model);
  const actions = document.createElement("footer");
  const reset = document.createElement("button"); reset.textContent = t("brush.restore");
  reset.dataset["brushReset"] = ""; reset.onclick = () => render(commands.reset());
  const done = document.createElement("button"); done.textContent = t("brush.done");
  done.onclick = () => dialog.close(); actions.append(reset, done);
  dialog.append(heading, hint, controls, actions);
  dialog.addEventListener("close", () => { commands.close(); dialog.remove(); }, { once: true });
  document.body.append(dialog); dialog.showModal();
}

function control(definition: BrushControlDefinition, preset: BrushPreset,
  change: SettingsCommands["change"]): HTMLLabelElement {
  const label = document.createElement("label"), name = document.createElement("span");
  name.textContent = t(definition.labelKey);
  const output = document.createElement("output");
  const initial = readBrushValue(preset, definition.path);
  const input = definition.kind === "select" ? document.createElement("select")
    : document.createElement("input");
  input.dataset["brushControl"] = definition.path;
  if (input instanceof HTMLSelectElement) {
    for (const value of definition.options ?? []) {
      const option = document.createElement("option"); option.value = value;
      option.textContent = t(`control.action.${value}`); input.append(option);
    }
  } else {
    input.type = definition.kind;
    input.checked = initial === true;
    if (definition.minimum !== undefined) input.min = String(definition.minimum);
    if (definition.maximum !== undefined) input.max = String(definition.maximum);
    if (definition.step !== undefined) input.step = String(definition.step);
  }
  input.value = String(initial);
  const display = (value: BrushScalarValue): void => {
    output.textContent = typeof value === "number"
      ? definition.display === "percent" ? `${Math.round(value * 100)}%`
        : `${Math.round(value * 100) / 100}${definition.display === "degrees" ? "°" : ""}` : "";
  };
  display(initial);
  input.oninput = () => {
    const value = input instanceof HTMLInputElement && input.type === "checkbox" ? input.checked
      : definition.kind === "range" ? Number(input.value) : input.value;
    display(value); change(definition.path, value);
  };
  label.append(name, output, input); return label;
}
