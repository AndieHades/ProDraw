type PreviewTask = (signal: AbortSignal) => Promise<void> | void;

interface PreviewEntry {
  readonly task: PreviewTask;
  readonly controller: AbortController;
  readonly resolve: () => void;
  settled: boolean;
}

export interface BrushPreviewJob {
  readonly finished: Promise<void>;
  cancel(): void;
}

const yieldToInterface = (signal: AbortSignal): Promise<void> => new Promise((resolve) => {
  if (signal.aborted) { resolve(); return; }
  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(() => resolve());
    signal.addEventListener("abort", () => {
      if (typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(handle);
      }
      resolve();
    }, { once: true });
    return;
  }
  const handle = window.setTimeout(resolve, 0);
  signal.addEventListener("abort", () => {
    window.clearTimeout(handle);
    resolve();
  }, { once: true });
});

export class BrushPreviewQueue {
  #pending: PreviewEntry[] = [];
  #active: PreviewEntry | null = null;
  #paused = false;
  #foreground = 0;
  #idle: Array<() => void> = [];

  schedule(task: PreviewTask): BrushPreviewJob {
    let resolve = (): void => undefined;
    const finished = new Promise<void>((done) => { resolve = done; });
    const entry: PreviewEntry = { task, controller: new AbortController(), resolve,
      settled: false };
    this.#pending.push(entry);
    this.#pump();
    return { finished, cancel: () => this.#cancel(entry) };
  }

  async runForeground<T>(task: () => Promise<T> | T): Promise<T> {
    this.#foreground += 1;
    try { return await task(); }
    finally {
      this.#foreground -= 1;
      this.#pump();
      this.#settleIdle();
    }
  }

  pause(): void { this.#paused = true; }
  resume(): void { this.#paused = false; this.#pump(); }

  cancelAll(): void {
    for (const entry of [...this.#pending]) this.#cancel(entry);
    this.#active?.controller.abort();
    this.#settleIdle();
  }

  whenIdle(): Promise<void> {
    if (this.#isIdle()) return Promise.resolve();
    return new Promise((resolve) => this.#idle.push(resolve));
  }

  #cancel(entry: PreviewEntry): void {
    entry.controller.abort();
    const index = this.#pending.indexOf(entry);
    if (index >= 0) {
      this.#pending.splice(index, 1);
      this.#finish(entry);
    }
    this.#settleIdle();
  }

  #pump(): void {
    if (this.#active || this.#paused || this.#foreground > 0) return;
    const entry = this.#pending.shift();
    if (!entry) { this.#settleIdle(); return; }
    this.#active = entry;
    void this.#run(entry);
  }

  async #run(entry: PreviewEntry): Promise<void> {
    await yieldToInterface(entry.controller.signal);
    if (this.#paused || this.#foreground > 0) {
      this.#active = null;
      if (!entry.controller.signal.aborted) this.#pending.unshift(entry);
      else this.#finish(entry);
      this.#pump();
      return;
    }
    try {
      if (!entry.controller.signal.aborted) await entry.task(entry.controller.signal);
    } catch { /* A failed optional preview must not block the remaining queue. */ }
    this.#active = null;
    this.#finish(entry);
    this.#pump();
    this.#settleIdle();
  }

  #finish(entry: PreviewEntry): void {
    if (entry.settled) return;
    entry.settled = true;
    entry.resolve();
  }

  #isIdle(): boolean {
    return !this.#active && this.#pending.length === 0 && this.#foreground === 0;
  }

  #settleIdle(): void {
    if (!this.#isIdle()) return;
    for (const resolve of this.#idle.splice(0)) resolve();
  }
}
