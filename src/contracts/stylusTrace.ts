import type { PointerContact } from "./pointer";

export type StylusTracePhase = "down" | "move" | "up" | "cancel" |
  "lost-capture" | "blur" | "hidden";

export interface StylusTraceEvent {
  readonly phase: StylusTracePhase;
  readonly time: number;
  readonly contact: PointerContact | null;
}

export interface StylusTraceFile {
  readonly format: "prodraw-stylus-trace";
  readonly version: 1;
  readonly source: "windows-ink";
  readonly createdAt: string;
  readonly brushId: string;
  readonly events: readonly StylusTraceEvent[];
  readonly truncated: boolean;
}
