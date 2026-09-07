// DOM adapter for Brightness/Contrast fields. The owning system keeps session
// state and transactions; this module only reads/writes the compact form.
import { $ } from "../../core/shell.ts";
import { adjustmentParams } from "../../logic/adjustment.ts";

const field = (id: string): HTMLInputElement | null => {
  const element = $(id);
  return element instanceof HTMLInputElement ? element : null;
};
const value = (id: string): string => field(id)?.value ?? "0";
const label = (id: string, text: string): void => {
  const element = $(id); if (element) element.textContent = text;
};

export function controlsToParams(): ReturnType<typeof adjustmentParams> {
  return adjustmentParams({
    brightness: value("bc-bri"), contrast: value("bc-con"),
    saturation: value("bc-sat"), hue: value("bc-hue"),
  });
}

export function syncLabels(): void {
  label("bc-briv", value("bc-bri")); label("bc-conv", value("bc-con"));
  label("bc-satv", value("bc-sat")); label("bc-huev", value("bc-hue"));
}

export function setControls(params: Parameters<typeof adjustmentParams>[0] = {}): void {
  const values = adjustmentParams(params);
  const set = (id: string, next: number) => {
    const element = field(id); if (element) element.value = String(next);
  };
  set("bc-bri", values.brightness); set("bc-con", values.contrast);
  set("bc-sat", values.saturation); set("bc-hue", values.hue);
  syncLabels();
}
