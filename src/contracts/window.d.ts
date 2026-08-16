import type { DesktopBridge } from "./platform";

declare global {
  interface Window {
    prodrawDesktop?: DesktopBridge;
  }
}

export {};
