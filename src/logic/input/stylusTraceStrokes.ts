import type { StrokeSample } from "../../contracts/stroke";
import type { StylusTraceFile } from "../../contracts/stylusTrace";
import { normalizePointerPressure } from "../stroke/interpolateStroke";

export interface ReplayedStylusStroke {
  readonly samples: readonly StrokeSample[];
  readonly termination: "commit" | "cancel";
}

export function stylusTraceStrokes(trace: StylusTraceFile): readonly ReplayedStylusStroke[] {
  const strokes: ReplayedStylusStroke[] = [];
  let active: StrokeSample[] | null = null;
  for (const event of trace.events) {
    const contact = event.contact;
    if (event.phase === "down" && contact?.kind === "pen") {
      if (active) strokes.push({ samples: active, termination: "cancel" });
      active = [sample(contact)]; continue;
    }
    if (event.phase === "move" && active && contact?.kind === "pen") {
      active.push(sample(contact)); continue;
    }
    if (event.phase === "up" && active && contact?.kind === "pen") {
      active.push(sample(contact)); strokes.push({ samples: active, termination: "commit" });
      active = null; continue;
    }
    if ((event.phase === "cancel" || event.phase === "lost-capture" ||
      event.phase === "blur" || event.phase === "hidden") && active) {
      strokes.push({ samples: active, termination: "cancel" }); active = null;
    }
  }
  if (active) strokes.push({ samples: active, termination: "cancel" });
  return strokes;
}

function sample(contact: NonNullable<StylusTraceFile["events"][number]["contact"]>): StrokeSample {
  return { x: contact.x, y: contact.y,
    pressure: normalizePointerPressure(contact.pressure, contact.kind),
    tiltX: contact.tiltX, tiltY: contact.tiltY, time: contact.time,
    pointerType: contact.kind };
}
