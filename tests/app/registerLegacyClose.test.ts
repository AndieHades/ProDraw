import { afterEach, describe, expect, it, vi } from "vitest";
import type { DesktopBridge } from "../../src/contracts/platform";
import { decideLegacyClose, registerLegacyClose } from "../../src/app/registerLegacyClose";

const finishInput = () => undefined;

describe("legacy desktop close", () => {
  afterEach(() => { vi.useRealTimers(); });

  it("answers the close request with the current document save", async () => {
    let closeHandler: (() => void) | undefined;
    const bridge = { onCloseRequested: vi.fn((handler) => { closeHandler = handler;
      return () => undefined; }), resolveCloseRequest: vi.fn() } as unknown as DesktopBridge;
    const saveCurrent = vi.fn(async () => true);
    registerLegacyClose(bridge, { finishInput, saveCurrent }); closeHandler?.();
    await vi.waitFor(() => expect(bridge.resolveCloseRequest)
      .toHaveBeenCalledWith({ action: "close" }));
    expect(saveCurrent).toHaveBeenCalledOnce();
  });

  it("finishes the open gesture before saving, even if that throws", async () => {
    const order: string[] = [];
    const decision = await decideLegacyClose({
      finishInput: () => { order.push("input"); throw new Error("broken brush"); },
      saveCurrent: async () => { order.push("save"); return true; }
    });
    expect(order).toEqual(["input", "save"]);
    expect(decision).toEqual({ action: "close" });
  });

  it("retries a save that raced with an edit", async () => {
    const saveCurrent = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    expect(await decideLegacyClose({ finishInput, saveCurrent })).toEqual({ action: "close" });
    expect(saveCurrent).toHaveBeenCalledTimes(2);
  });

  it("asks the user when the save keeps failing", async () => {
    const saveCurrent = vi.fn(async (): Promise<boolean> => { throw new Error("quota"); });
    const decision = await decideLegacyClose({ finishInput, saveCurrent, attempts: 3 });
    expect(saveCurrent).toHaveBeenCalledTimes(3);
    expect(decision.action).toBe("ask");
    if (decision.action === "ask") expect(decision.prompt.confirmLabel).not.toBe("");
  });

  it("asks the user when the save never finishes", async () => {
    vi.useFakeTimers();
    const pending = decideLegacyClose({ finishInput, timeoutMs: 1_000,
      saveCurrent: () => new Promise<boolean>(() => undefined) });
    await vi.advanceTimersByTimeAsync(1_000);
    expect((await pending).action).toBe("ask");
  });
});
