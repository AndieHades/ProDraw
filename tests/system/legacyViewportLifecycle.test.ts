/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import * as bus from "../../src/core/bus.ts";
import { mountLegacyViewportLifecycle } from
  "../../src/systems/viewport/LegacyViewportLifecycle.ts";

describe("legacy viewport lifecycle", () => {
  it("fits on gallery transition and page exit", () => {
    const fit = vi.fn();
    mountLegacyViewportLifecycle(fit);
    bus.emit("document-transition");
    window.dispatchEvent(new Event("pagehide"));
    expect(fit).toHaveBeenCalledTimes(2);
  });
});
