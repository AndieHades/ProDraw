import type { PlatformPort } from "../contracts/platform";
import type { BrushDecoderPort } from "../contracts/brushDecoder";
import { decodeProcreateBrush } from "../core/brush/procreateBrush";
import { createBrushDecoder } from "../platform/brush/createBrushDecoder";
import { selectPlatform } from "../platform/selectPlatform";

export function createPlatform(): PlatformPort {
  const fallback: BrushDecoderPort = { decode: decodeProcreateBrush };
  return selectPlatform(undefined, undefined, createBrushDecoder(fallback));
}
