// Window close handshake without Electron imports, so it can be tested.
// The window may never stay open silently: a renderer that does not answer is
// closed, a renderer that could not save asks the user, and only the user's
// explicit "keep open" (or the renderer's own "stay") keeps the window.

export const CLOSE_LIMITS = Object.freeze({
  // The renderer did not even receive the request: its main thread is hung.
  ackMs: 5_000,
  // The renderer is alive but never decided (it bounds its own save earlier).
  decisionMs: 45_000
});

export function parseCloseDecision(value) {
  const action = value?.action;
  if (action === "stay") return { action };
  const prompt = action === "ask" ? value.prompt : null;
  if (prompt && typeof prompt === "object") {
    return { action, prompt: { title: String(prompt.title), message: String(prompt.message),
      confirmLabel: String(prompt.confirmLabel), cancelLabel: String(prompt.cancelLabel) } };
  }
  return { action: "close" };
}

export function createCloseHandshake(port, limits = CLOSE_LIMITS) {
  let state = "idle", timer = null;
  const stopTimer = () => { if (timer !== null) port.clearTimer(timer); timer = null; };
  const close = () => { stopTimer(); state = "closed"; port.destroy(); };
  const stay = () => { stopTimer(); state = "idle"; };
  const wait = (next, ms) => { stopTimer(); state = next; timer = port.setTimer(close, ms); };
  const ask = (prompt) => {
    state = "asking";
    Promise.resolve().then(() => port.confirm(prompt)).then(
      (closeAnyway) => { if (state === "asking") (closeAnyway ? close : stay)(); },
      // The dialog itself failed: asking again would fail the same way.
      () => { if (state === "asking") close(); });
  };
  return {
    request() {
      if (state !== "idle") return;
      if (port.rendererGone()) { close(); return; }
      wait("ack", limits.ackMs);
      port.send();
    },
    acknowledge() { if (state === "ack") wait("decision", limits.decisionMs); },
    decide(value) {
      if (state !== "ack" && state !== "decision") return;
      stopTimer();
      const decision = parseCloseDecision(value);
      if (decision.action === "close") close();
      else if (decision.action === "stay") stay();
      else ask(decision.prompt);
    },
    dispose() { stopTimer(); state = "closed"; }
  };
}
