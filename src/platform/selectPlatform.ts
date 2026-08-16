import type { DesktopBridge, PlatformPort } from "../contracts/platform";
import { createDesktopPlatform } from "./createDesktopPlatform";
import { createWebPlatform } from "./createWebPlatform";

export function selectPlatform(
  bridge: DesktopBridge | undefined = undefined,
  web: PlatformPort | undefined = undefined
): PlatformPort {
  const desktop = bridge ?? (typeof window === "undefined" ? undefined : window.prodrawDesktop);
  return desktop ? createDesktopPlatform(desktop) : (web ?? createWebPlatform());
}
