import type { DesktopBridge } from "../contracts/platform";

declare global {
  interface Window {
    prodrawDesktop?: DesktopBridge;
  }
}

export {};
