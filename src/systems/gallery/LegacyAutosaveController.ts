type TimerHandle = ReturnType<typeof setTimeout>;
type IdleHandle = number | TimerHandle;
const defaultSetTimer = (callback: () => void, delay: number): TimerHandle =>
  setTimeout(callback, delay) as TimerHandle;
const defaultClearTimer = (handle: TimerHandle): void => clearTimeout(handle);

interface LegacyAutosaveScheduler {
  readonly delayMs: number;
  readonly retryMs: number;
  readonly idleTimeoutMs: number;
  readonly isInputActive: () => boolean;
  readonly save: (isCurrent: () => boolean) => Promise<void>;
  readonly onError?: (error: unknown) => void;
  readonly setTimer?: (callback: () => void, delay: number) => TimerHandle;
  readonly clearTimer?: (handle: TimerHandle) => void;
  readonly requestIdle?: (callback: () => void, timeout: number) => IdleHandle;
  readonly cancelIdle?: (handle: IdleHandle) => void;
}

const defaultRequestIdle = (callback: () => void, timeout: number): IdleHandle => {
  if (typeof requestIdleCallback === "function") {
    return requestIdleCallback(callback, { timeout });
  }
  return setTimeout(callback, 0);
};

const defaultCancelIdle = (handle: IdleHandle): void => {
  if (typeof cancelIdleCallback === "function" && typeof handle === "number") {
    cancelIdleCallback(handle); return;
  }
  clearTimeout(handle as TimerHandle);
};

export class LegacyAutosaveController {
  readonly #options: LegacyAutosaveScheduler;
  #timer: TimerHandle | null = null;
  #idle: IdleHandle | null = null;
  #generation = 0;
  #pending = false;
  #running = false;

  constructor(options: LegacyAutosaveScheduler) { this.#options = options; }

  request(): void {
    this.#pending = true; this.#generation += 1;
    this.cancelScheduled(); this.schedule(this.#options.delayMs);
  }

  inputStarted(): void {
    if (!this.#pending && !this.#running) return;
    this.#pending = true; this.#generation += 1;
    this.cancelScheduled(); this.schedule(this.#options.retryMs);
  }

  supersede(): void {
    this.#pending = false; this.#generation += 1; this.cancelScheduled();
  }

  cancelScheduled(): void {
    const clearTimer = this.#options.clearTimer ?? defaultClearTimer;
    const cancelIdle = this.#options.cancelIdle ?? defaultCancelIdle;
    if (this.#timer !== null) clearTimer(this.#timer);
    if (this.#idle !== null) cancelIdle(this.#idle);
    this.#timer = null; this.#idle = null;
  }

  private schedule(delay: number): void {
    const setTimer = this.#options.setTimer ?? defaultSetTimer;
    const clearTimer = this.#options.clearTimer ?? defaultClearTimer;
    if (this.#timer !== null) clearTimer(this.#timer);
    this.#timer = setTimer(() => { this.#timer = null; this.waitForIdle(); }, delay);
  }

  private waitForIdle(): void {
    if (!this.#pending) return;
    if (this.#options.isInputActive() || this.#running) {
      this.schedule(this.#options.retryMs); return;
    }
    const requestIdle = this.#options.requestIdle ?? defaultRequestIdle;
    this.#idle = requestIdle(() => { this.#idle = null; void this.start(); },
      this.#options.idleTimeoutMs);
  }

  private async start(): Promise<void> {
    if (!this.#pending || this.#options.isInputActive() || this.#running) {
      if (this.#pending) this.schedule(this.#options.retryMs); return;
    }
    const generation = this.#generation; this.#pending = false; this.#running = true;
    const isCurrent = () => generation === this.#generation &&
      !this.#options.isInputActive();
    try { await this.#options.save(isCurrent); }
    catch (error) { this.#options.onError?.(error); }
    finally {
      this.#running = false;
      if (this.#pending) this.schedule(this.#options.retryMs);
    }
  }
}
