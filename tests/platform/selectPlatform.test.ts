import { describe, expect, it, vi } from "vitest";
import type { DesktopBridge, PlatformPort } from "../../src/contracts/platform";
import { selectPlatform } from "../../src/platform/selectPlatform";
import { decodeProcreateBrush } from "../../src/core/brush/procreateBrush";

const web: PlatformPort = {
  kind: "web",
  brushStorage: null,
  brushDecoder: { decode: decodeProcreateBrush },
  openBinary: vi.fn(async () => null),
  saveBinary: vi.fn(async () => null),
  writeBinary: vi.fn(async () => false),
  confirmDiscard: vi.fn(async () => true),
  onCloseRequested: vi.fn(() => () => undefined)
};

describe("selectPlatform", () => {
  it("keeps the web adapter when desktop preload is absent", () => {
    expect(selectPlatform(undefined, web)).toBe(web);
  });

  it("adapts the allowlisted desktop bridge", async () => {
    const bridge: DesktopBridge = {
      platform: "windows",
      fileLocation: vi.fn(() => null),
      brushStorage: {
        ensureSeeded: vi.fn(async () => undefined),
        listSets: vi.fn(async () => []),
        readFile: vi.fn(async () => new ArrayBuffer(0)),
        writeFile: vi.fn(async () => undefined),
        trashFile: vi.fn(async () => undefined),
        createSet: vi.fn(async () => undefined),
        renameSet: vi.fn(async () => undefined),
        moveFile: vi.fn(async () => undefined),
      trashSet: vi.fn(async () => undefined),
      restoreTrash: vi.fn(async () => 0),
      revealFolder: vi.fn(async () => undefined),
        readState: vi.fn(async () => null),
        writeState: vi.fn(async () => undefined)
      },
      fileTree: {
        begin: vi.fn(async () => null),
        ensureDirectory: vi.fn(async () => true),
        write: vi.fn(async () => true),
        commit: vi.fn(async () => ({ name: "Layers", location: "C:\\Art\\Layers" })),
        abort: vi.fn(async () => true)
      },
      openBinary: vi.fn(async () => ({
        name: "work.prodraw",
        location: "C:\\Art\\work.prodraw",
        bytes: Uint8Array.from([1, 2, 3]).buffer
      })),
      saveBinary: vi.fn(async () => ({
        name: "work.prodraw", location: "C:\\Art\\work.prodraw"
      })),
      writeBinary: vi.fn(async () => true),
      confirmDiscard: vi.fn(async () => true),
      onCloseRequested: vi.fn(() => () => undefined),
      resolveCloseRequest: vi.fn()
    };
    const platform = selectPlatform(bridge, web);
    expect(platform.kind).toBe("windows");
    expect((await platform.openBinary())?.bytes).toEqual(Uint8Array.from([1, 2, 3]));
    await expect(platform.saveBinary({
      suggestedName: "work.prodraw",
      bytes: Uint8Array.from([4, 5])
    })).resolves.toEqual({ name: "work.prodraw", location: "C:\\Art\\work.prodraw" });
    expect(bridge.saveBinary).toHaveBeenCalledOnce();
  });
});
