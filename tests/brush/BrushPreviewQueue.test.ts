/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { BrushPreviewQueue } from "../../src/ui/brushes/BrushPreviewQueue";

describe("brush preview scheduling", () => {
  it("starts foreground selection before a yielded background preview", async () => {
    const queue = new BrushPreviewQueue();
    const order: string[] = [];
    queue.schedule(() => { order.push("background"); });

    await queue.runForeground(() => { order.push("selection"); });
    await queue.whenIdle();

    expect(order).toEqual(["selection", "background"]);
  });

  it("cancels queued preview work while the owner is paused", async () => {
    const queue = new BrushPreviewQueue();
    const work = vi.fn();
    queue.pause();
    const job = queue.schedule(work);

    job.cancel();
    queue.resume();
    await job.finished;
    await queue.whenIdle();

    expect(work).not.toHaveBeenCalled();
  });

  it("keeps background work paused until the owner becomes visible", async () => {
    const queue = new BrushPreviewQueue();
    const work = vi.fn();
    queue.pause();
    queue.schedule(work);
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    expect(work).not.toHaveBeenCalled();

    queue.resume();
    await queue.whenIdle();
    expect(work).toHaveBeenCalledOnce();
  });
});
