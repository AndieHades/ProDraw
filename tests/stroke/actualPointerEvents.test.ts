import { describe, expect, it } from "vitest";
import { actualPointerEvents } from "../../src/core/input/actualPointerEvents";

const pointer = (timeStamp: number, clientX: number) =>
  ({ timeStamp, clientX, clientY: 0, pressure: 0.5 }) as PointerEvent;

describe("actualPointerEvents", () => {
  it("appends the actual event when coalesced history omits the endpoint", () => {
    const event = { ...pointer(3, 30),
      getCoalescedEvents: () => [pointer(1, 10), pointer(2, 20)] } as PointerEvent;
    expect(actualPointerEvents(event).map(({ clientX }) => clientX)).toEqual([10, 20, 30]);
  });

  it("does not duplicate an endpoint already present in coalesced history", () => {
    const event = { ...pointer(3, 30),
      getCoalescedEvents: () => [pointer(2, 20), pointer(3, 30)] } as PointerEvent;
    expect(actualPointerEvents(event)).toHaveLength(2);
  });
});
