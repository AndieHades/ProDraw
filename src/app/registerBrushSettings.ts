import * as actions from "../core/actions.ts";

export function registerBrushSettings(): void {
  actions.registerOrReplace("ui.brushSettings", () => {
    void Promise.all([import("../systems/draw/brush-settings.ts"),
      import("../ui/brushes/LiveBrushSettingsPresenter.ts")]).then(([system, ui]) => {
      system.openBrushSettings(ui.openLiveBrushSettings);
    });
  });
}
