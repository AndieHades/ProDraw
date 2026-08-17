import type { PointerContact } from "../../contracts/pointer";
import type {
  StylusTraceEvent, StylusTraceFile, StylusTracePhase
} from "../../contracts/stylusTrace";
import { POINTER_INPUT } from "../../config/input";

const encoder = new TextEncoder();

export class StylusTraceRecorder {
  readonly #now: () => string;
  #recording = false;
  #brushId = "";
  #createdAt = "";
  #events: StylusTraceEvent[] = [];
  #truncated = false;

  constructor(now: () => string = () => new Date().toISOString()) { this.#now = now; }
  get recording(): boolean { return this.#recording; }
  get hasTrace(): boolean { return this.#events.length > 0; }

  start(brushId: string): void {
    this.#recording = true; this.#brushId = brushId; this.#createdAt = this.#now();
    this.#events = []; this.#truncated = false;
  }

  stop(): void { this.#recording = false; }

  pointer(phase: Exclude<StylusTracePhase, "blur" | "hidden">,
    contact: PointerContact): void {
    this.append({ phase, time: contact.time, contact: { ...contact } });
  }

  lifecycle(phase: "blur" | "hidden", time: number): void {
    this.append({ phase, time, contact: null });
  }

  file(): StylusTraceFile | null {
    if (!this.hasTrace) return null;
    return { format: "prodraw-stylus-trace", version: 1, source: "windows-ink",
      createdAt: this.#createdAt, brushId: this.#brushId,
      events: this.#events.map((event) => ({ ...event,
        contact: event.contact ? { ...event.contact } : null })),
      truncated: this.#truncated };
  }

  bytes(): Uint8Array<ArrayBuffer> {
    const file = this.file();
    if (!file) throw new Error("No stylus trace has been recorded");
    return encoder.encode(`${JSON.stringify(file, null, 2)}\n`);
  }

  private append(event: StylusTraceEvent): void {
    if (!this.#recording) return;
    if (this.#events.length >= POINTER_INPUT.maximumTraceSamples) {
      this.#truncated = true; this.#recording = false; return;
    }
    this.#events.push(event);
  }
}
