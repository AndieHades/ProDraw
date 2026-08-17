import type { DesktopBridge, PlatformPort } from "../contracts/platform";
import type { BrushDecoderPort } from "../contracts/brushDecoder";
import { createDesktopPlatform } from "./createDesktopPlatform";
import { createWebPlatform } from "./createWebPlatform";

export function selectPlatform(
  bridge: DesktopBridge | undefined = undefined,
  web: PlatformPort | undefined = undefined,
  decoder: BrushDecoderPort | undefined = web?.brushDecoder
): PlatformPort {
  const desktop = bridge ?? (typeof window === "undefined" ? undefined : window.prodrawDesktop);
  if (desktop && decoder) return createDesktopPlatform(desktop, decoder);
  if (web) return web;
  if (!decoder) throw new Error("Brush decoder is required");
  return createWebPlatform(decoder);
}
