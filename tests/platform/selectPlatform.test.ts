import { describe, expect, it, vi } from "vitest";
import type { DesktopBridge, PlatformPort } from "../../src/contracts/platform";
import { selectPlatform } from "../../src/platform/selectPlatform";

const web: PlatformPort = {
  kind: "web",
  openBinary: vi.fn(async () => null),
  saveBinary: vi.fn(async () => true)
};

describe("selectPlatform", () => {
  it("keeps the web adapter when desktop preload is absent", () => {
    expect(selectPlatform(undefined, web)).toBe(web);
  });

  it("adapts the allowlisted desktop bridge", async () => {
    const bridge: DesktopBridge = {
      platform: "windows",
      openBinary: vi.fn(async () => ({
        name: "work.prodraw",
        bytes: Uint8Array.from([1, 2, 3]).buffer
      })),
      saveBinary: vi.fn(async () => true)
    };
    const platform = selectPlatform(bridge, web);
    expect(platform.kind).toBe("windows");
    expect((await platform.openBinary())?.bytes).toEqual(Uint8Array.from([1, 2, 3]));
    await expect(platform.saveBinary({
      suggestedName: "work.prodraw",
      bytes: Uint8Array.from([4, 5])
    })).resolves.toBe(true);
    expect(bridge.saveBinary).toHaveBeenCalledOnce();
  });
});
