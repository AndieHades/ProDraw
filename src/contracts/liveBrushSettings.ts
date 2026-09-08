import type { BrushPreset } from "./brush.ts";
export interface BrushSettingsModel { readonly preset: BrushPreset; readonly hasGrain: boolean }
export interface BrushSettingsCommands {
  readonly change: (path: string, value: string | number | boolean) => void;
  readonly reset: () => BrushSettingsModel;
  readonly close: () => void;
}
export type OpenBrushSettings = (model: BrushSettingsModel, commands: BrushSettingsCommands) => void;
