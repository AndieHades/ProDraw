import { describe, expect, it, vi } from "vitest";
import type { DesktopBridge } from "../../src/contracts/platform";
import { registerLegacyClose } from "../../src/app/registerLegacyClose";

describe("legacy desktop close", () => {
  it("answers the close request with the current document save", async () => {
    let closeHandler: (() => void) | undefined;
    const bridge = { onCloseRequested: vi.fn((handler) => { closeHandler = handler;
      return () => undefined; }), resolveCloseRequest: vi.fn() } as unknown as DesktopBridge;
    const saveCurrent = vi.fn(async () => true);
    registerLegacyClose(bridge, saveCurrent); closeHandler?.(); await Promise.resolve();
    expect(saveCurrent).toHaveBeenCalledOnce();
    expect(bridge.resolveCloseRequest).toHaveBeenCalledWith(true);
  });
});
