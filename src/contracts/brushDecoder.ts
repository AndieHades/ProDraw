import type { BrushPreset, LoadedBrush } from "./brush";

export interface BrushDecoderPort {
  decode(
    bytes: Uint8Array<ArrayBuffer>,
    preset: BrushPreset
  ): Promise<LoadedBrush>;
}
