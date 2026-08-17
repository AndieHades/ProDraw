import type { ShellEventName } from "../contracts/shellEventCatalog.ts";

type StoredListener = (payload: unknown) => void;
const listeners = new Map<ShellEventName, Set<StoredListener>>();

export function on<Payload>(
  event: ShellEventName, listener: (payload: Payload) => void
): () => boolean {
  let eventListeners = listeners.get(event);
  if (!eventListeners) {
    eventListeners = new Set();
    listeners.set(event, eventListeners);
  }
  eventListeners.add(listener as StoredListener);
  return () => eventListeners.delete(listener as StoredListener);
}

export function emit(event: ShellEventName, payload?: unknown): void {
  const eventListeners = listeners.get(event);
  if (!eventListeners) return;
  for (const listener of eventListeners) listener(payload);
}

export function emitDoc(): void {
  emit("layers");
  emit("render");
}
