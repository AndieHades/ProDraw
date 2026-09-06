import { describe, expect, it, vi } from "vitest";
import type { PlatformPort } from "../../src/contracts/platform";
import { registerLegacyClose } from "../../src/app/registerLegacyClose";

describe("legacy desktop close", () => {
  it("answers the close request with the current document save", async () => {
    const closeHandlers: Array<() => Promise<boolean>> = [];
    const platform = {
      kind: "windows",
      onCloseRequested: vi.fn((handler) => { closeHandlers.push(handler);
        return () => undefined; })
    } as unknown as PlatformPort;
    const saveCurrent = vi.fn(async () => true);

    registerLegacyClose(platform, saveCurrent);

    expect(platform.onCloseRequested).toHaveBeenCalledOnce();
    const closeHandler = closeHandlers[0];
    if (!closeHandler) throw new Error("Close handler was not registered");
    await expect(closeHandler()).resolves.toBe(true);
    expect(saveCurrent).toHaveBeenCalledOnce();
  });
});
