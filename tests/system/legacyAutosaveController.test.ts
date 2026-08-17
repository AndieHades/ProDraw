import { afterEach, describe, expect, it, vi } from "vitest";
import { LegacyAutosaveController } from
  "../../src/systems/gallery/LegacyAutosaveController";

const immediateIdle = (callback: () => void) => { callback(); return 1; };

describe("legacy autosave controller", () => {
  afterEach(() => vi.useRealTimers());

  it("never starts record work while a pen stroke is active", async () => {
    vi.useFakeTimers(); let drawing = true;
    const save = vi.fn(async () => undefined);
    const controller = new LegacyAutosaveController({ delayMs: 20, retryMs: 5,
      idleTimeoutMs: 50, isInputActive: () => drawing, save,
      requestIdle: immediateIdle, cancelIdle: () => undefined });

    controller.request(); await vi.advanceTimersByTimeAsync(25);
    expect(save).not.toHaveBeenCalled();
    drawing = false; await vi.advanceTimersByTimeAsync(5);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("invalidates an in-flight clone when a new stroke begins", async () => {
    vi.useFakeTimers(); let drawing = false, release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const checkpoints: boolean[] = [];
    const save = vi.fn(async (isCurrent: () => boolean) => {
      checkpoints.push(isCurrent());
      if (save.mock.calls.length === 1) await gate;
      checkpoints.push(isCurrent());
    });
    const controller = new LegacyAutosaveController({ delayMs: 10, retryMs: 5,
      idleTimeoutMs: 50, isInputActive: () => drawing, save,
      requestIdle: immediateIdle, cancelIdle: () => undefined });

    controller.request(); await vi.advanceTimersByTimeAsync(10);
    drawing = true; controller.inputStarted(); release(); await Promise.resolve();
    expect(checkpoints).toEqual([true, false]);
    drawing = false; await vi.advanceTimersByTimeAsync(5);
    expect(save).toHaveBeenCalledTimes(2);
  });
});
