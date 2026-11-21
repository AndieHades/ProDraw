import { describe, expect, it, vi } from "vitest";
import { createCloseHandshake, parseCloseDecision } from "../../desktop/close-handshake.mjs";

const limits = { ackMs: 50, decisionMs: 500 };
const prompt = { title: "T", message: "M", confirmLabel: "Close", cancelLabel: "Keep" };

function harness({ confirm = async () => false, gone = false } = {}) {
  vi.useFakeTimers();
  const port = { send: vi.fn(), destroy: vi.fn(), rendererGone: () => gone,
    confirm: vi.fn(confirm), setTimer: (callback, ms) => setTimeout(callback, ms),
    clearTimer: (timer) => clearTimeout(timer) };
  return { port, handshake: createCloseHandshake(port, limits) };
}
const settle = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

describe("desktop close handshake", () => {
  it("closes when the renderer saved", () => {
    const { port, handshake } = harness();
    handshake.request(); handshake.acknowledge(); handshake.decide({ action: "close" });
    expect(port.send).toHaveBeenCalledOnce();
    expect(port.destroy).toHaveBeenCalledOnce();
  });

  it("asks the user instead of refusing silently when the save failed", async () => {
    const { port, handshake } = harness({ confirm: async () => true });
    handshake.request(); handshake.acknowledge(); handshake.decide({ action: "ask", prompt });
    await settle();
    expect(port.confirm).toHaveBeenCalledWith(prompt);
    expect(port.destroy).toHaveBeenCalledOnce();
  });

  it("keeps the window only on the user's explicit choice and allows a retry", async () => {
    const { port, handshake } = harness();
    handshake.request(); handshake.decide({ action: "ask", prompt }); await settle();
    vi.advanceTimersByTime(10_000);
    expect(port.destroy).not.toHaveBeenCalled();
    handshake.request();
    expect(port.send).toHaveBeenCalledTimes(2);
  });

  it("ignores repeated close clicks while the dialog is open", async () => {
    const { port, handshake } = harness({ confirm: () => new Promise(() => undefined) });
    handshake.request(); handshake.decide({ action: "ask", prompt }); await settle();
    handshake.request(); handshake.request();
    expect(port.send).toHaveBeenCalledOnce();
    expect(port.confirm).toHaveBeenCalledOnce();
  });

  it("force-closes a renderer that never received the request", () => {
    const { port, handshake } = harness();
    handshake.request(); vi.advanceTimersByTime(limits.ackMs);
    expect(port.destroy).toHaveBeenCalledOnce();
  });

  it("waits longer for an alive renderer, but not forever", () => {
    const { port, handshake } = harness();
    handshake.request(); handshake.acknowledge();
    vi.advanceTimersByTime(limits.ackMs * 2);
    expect(port.destroy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(limits.decisionMs);
    expect(port.destroy).toHaveBeenCalledOnce();
  });

  it("closes a crashed renderer at once and ignores late answers", () => {
    const { port, handshake } = harness({ gone: true });
    handshake.request(); handshake.decide({ action: "stay" });
    expect(port.send).not.toHaveBeenCalled();
    expect(port.destroy).toHaveBeenCalledOnce();
  });

  it("treats a malformed decision as close", () => {
    expect(parseCloseDecision(false)).toEqual({ action: "close" });
    expect(parseCloseDecision({ action: "ask" })).toEqual({ action: "close" });
    expect(parseCloseDecision({ action: "stay" })).toEqual({ action: "stay" });
  });
});
