import { describe, expect, it } from "vitest";
import type { PointerContact } from "../../src/contracts/pointer";
import { StylusTraceRecorder } from "../../src/core/input/StylusTraceRecorder";
import { parseStylusTrace } from "../../src/core/input/parseStylusTrace";
import { stylusTraceStrokes } from "../../src/logic/input/stylusTraceStrokes";

const contact = (time: number, pressure: number, buttons: number): PointerContact => ({
  id: 9, kind: "pen", button: buttons === 32 ? 5 : 0, buttons,
  x: time, y: 12, pressure, tiltX: 18, tiltY: -7,
  width: 2, height: 2, time
});

describe("StylusTraceRecorder", () => {
  it("exports actual Windows Ink fields and lifecycle reasons as versioned JSON", () => {
    const recorder = new StylusTraceRecorder(() => "2026-08-16T12:00:00.000Z");
    recorder.start("ink-brush");
    recorder.pointer("down", contact(0, 0.12, 1));
    recorder.pointer("move", contact(8, 0.73, 32));
    recorder.lifecycle("blur", 9);
    recorder.pointer("up", contact(10, 0, 0));
    recorder.stop();
    recorder.pointer("move", contact(12, 1, 1));
    const file = recorder.file();
    expect(file?.format).toBe("prodraw-stylus-trace");
    expect(file?.source).toBe("windows-ink");
    expect(file?.events.map(({ phase }) => phase)).toEqual(["down", "move", "blur", "up"]);
    expect(file?.events[1]?.contact).toMatchObject({ pressure: 0.73,
      tiltX: 18, tiltY: -7, button: 5, buttons: 32 });
    const parsed = parseStylusTrace(recorder.bytes());
    expect(parsed.version).toBe(1);
    expect(stylusTraceStrokes(parsed)).toMatchObject([
      { termination: "cancel", samples: [{ pressure: 0.12 }, { pressure: 0.73 }] }
    ]);
  });

  it("restarts with a fresh trace", () => {
    const recorder = new StylusTraceRecorder(() => "now");
    recorder.start("first"); recorder.pointer("down", contact(0, 1, 1)); recorder.stop();
    recorder.start("second"); recorder.pointer("down", contact(1, 0.5, 1)); recorder.stop();
    expect(recorder.file()).toMatchObject({ brushId: "second", events: [{ time: 1 }] });
  });

  it("rejects malformed event data", () => {
    const invalid = new TextEncoder().encode(JSON.stringify({
      format: "prodraw-stylus-trace", version: 1, source: "windows-ink",
      createdAt: "now", brushId: "brush", events: [{ phase: "move", time: 1,
        contact: { pressure: "execute" } }]
    }));
    expect(() => parseStylusTrace(invalid)).toThrow("Invalid stylus trace event");
  });
});
