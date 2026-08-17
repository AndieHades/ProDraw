import { describe, expect, it } from "vitest";
import * as actions from "../../src/core/actions";
import * as bus from "../../src/core/bus";

describe("typed preserved-shell registries", () => {
  it("requires one explicit action owner", () => {
    actions.register("view.tile", (enabled: boolean) => enabled);
    expect(actions.run<boolean>("view.tile", true)).toBe(true);
    expect(actions.register("view.tile", () => false)).toBe(false);
    expect(actions.run<boolean>("view.tile", true)).toBe(true);
    actions.replace("view.tile", () => "replaced");
    expect(actions.run<string>("view.tile")).toBe("replaced");
    expect(actions.unregister("view.tile")).toBe(true);
    expect(actions.run("view.tile")).toBe(false);
  });

  it("subscribes and removes a typed shell event", () => {
    const payloads: string[] = [];
    const off = bus.on<string>("reference", (payload) => payloads.push(payload));
    bus.emit("reference", "open");
    expect(off()).toBe(true);
    bus.emit("reference", "closed");
    expect(payloads).toEqual(["open"]);
  });
});
