import type { BrushPreset, LoadedBrush } from "../../contracts/brush";
import type { StylusTracePhase } from "../../contracts/stylusTrace";
import { actualPointerEvents } from "../../core/input/actualPointerEvents";
import { pointerContact } from "../../core/input/pointerContact";
import { StylusTraceRecorder } from "../../core/input/StylusTraceRecorder";
import { t } from "../../i18n/raster/translate";
import { requiredElement } from "../dom/query";

type SaveTrace = (name: string, bytes: Uint8Array<ArrayBuffer>) => Promise<boolean>;

export class BrushStudioTracePresenter {
  readonly #canvas: HTMLCanvasElement;
  readonly #record = requiredElement<HTMLButtonElement>("#trace-record");
  readonly #save = requiredElement<HTMLButtonElement>("#trace-save");
  readonly #recorder = new StylusTraceRecorder();
  readonly #getBrush: () => BrushPreset | LoadedBrush;
  readonly #saveTrace: SaveTrace;

  constructor(canvas: HTMLCanvasElement, getBrush: () => BrushPreset | LoadedBrush,
    saveTrace: SaveTrace) {
    this.#canvas = canvas; this.#getBrush = getBrush; this.#saveTrace = saveTrace;
    this.#record.addEventListener("click", () => this.toggle());
    this.#save.addEventListener("click", () => void this.save());
    canvas.addEventListener("pointerdown", (event) => this.pointer("down", event));
    canvas.addEventListener("pointermove", (event) => {
      for (const actual of actualPointerEvents(event)) this.pointer("move", actual);
    });
    canvas.addEventListener("pointerup", (event) => this.pointer("up", event));
    canvas.addEventListener("pointercancel", (event) => this.pointer("cancel", event));
    canvas.addEventListener("lostpointercapture",
      (event) => this.pointer("lost-capture", event));
    window.addEventListener("blur", () => this.lifecycle("blur"));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") this.lifecycle("hidden");
    });
    this.render();
  }

  private toggle(): void {
    if (this.#recorder.recording) this.#recorder.stop();
    else this.#recorder.start(this.#getBrush().id);
    this.render();
  }

  private pointer(phase: Exclude<StylusTracePhase, "blur" | "hidden">,
    event: PointerEvent): void {
    if (event.pointerType !== "pen") return;
    const wasRecording = this.#recorder.recording;
    this.#recorder.pointer(phase,
      pointerContact(event, this.#canvas.getBoundingClientRect()));
    if (wasRecording && !this.#recorder.recording) this.render();
  }

  private lifecycle(phase: "blur" | "hidden"): void {
    const wasRecording = this.#recorder.recording;
    this.#recorder.lifecycle(phase, performance.now());
    if (wasRecording && !this.#recorder.recording) this.render();
  }

  private async save(): Promise<void> {
    const file = this.#recorder.file();
    if (!file) return;
    const stamp = file.createdAt.replaceAll(/[:.]/g, "-");
    await this.#saveTrace(`huion-${stamp}.prodraw-ink-trace.json`, this.#recorder.bytes());
  }

  private render(): void {
    this.#record.textContent = t(this.#recorder.recording ? "trace.stop" : "trace.record");
    this.#save.textContent = t("trace.save");
    this.#save.disabled = !this.#recorder.hasTrace || this.#recorder.recording;
  }
}
