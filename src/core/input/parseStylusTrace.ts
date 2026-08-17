import type { PointerContact, PointerKind } from "../../contracts/pointer";
import type {
  StylusTraceEvent, StylusTraceFile, StylusTracePhase
} from "../../contracts/stylusTrace";
import { POINTER_INPUT } from "../../config/input";

const decoder = new TextDecoder();
const phases = new Set<StylusTracePhase>([
  "down", "move", "up", "cancel", "lost-capture", "blur", "hidden"
]);
const kinds = new Set<PointerKind>(["mouse", "pen", "touch"]);
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

function contact(value: unknown): PointerContact | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<PointerContact>;
  if (!finite(item.id) || !kinds.has(item.kind as PointerKind) ||
    !finite(item.button) || !finite(item.buttons) || !finite(item.x) || !finite(item.y) ||
    !finite(item.pressure) || !finite(item.tiltX) || !finite(item.tiltY) ||
    !finite(item.width) || !finite(item.height) || !finite(item.time)) return null;
  return { id: item.id, kind: item.kind as PointerKind, button: item.button,
    buttons: item.buttons, x: item.x, y: item.y, pressure: item.pressure,
    tiltX: item.tiltX, tiltY: item.tiltY, width: item.width,
    height: item.height, time: item.time };
}

function event(value: unknown): StylusTraceEvent | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<StylusTraceEvent>;
  if (!phases.has(item.phase as StylusTracePhase) || !finite(item.time)) return null;
  const parsedContact = contact(item.contact);
  if (item.phase !== "blur" && item.phase !== "hidden" && !parsedContact) return null;
  return { phase: item.phase as StylusTracePhase, time: item.time,
    contact: parsedContact };
}

export function parseStylusTrace(bytes: Uint8Array<ArrayBuffer>): StylusTraceFile {
  const parsed = JSON.parse(decoder.decode(bytes)) as Partial<StylusTraceFile>;
  if (parsed.format !== "prodraw-stylus-trace" || parsed.version !== 1 ||
    parsed.source !== "windows-ink" || typeof parsed.createdAt !== "string" ||
    typeof parsed.brushId !== "string" || !Array.isArray(parsed.events) ||
    parsed.events.length > POINTER_INPUT.maximumTraceSamples) {
    throw new Error("Unsupported or invalid ProDraw stylus trace");
  }
  const events = parsed.events.map(event);
  if (events.some((item) => !item)) throw new Error("Invalid stylus trace event");
  return { format: parsed.format, version: parsed.version, source: parsed.source,
    createdAt: parsed.createdAt, brushId: parsed.brushId,
    events: events as StylusTraceEvent[], truncated: parsed.truncated === true };
}
