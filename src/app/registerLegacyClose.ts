import type { CloseDecision, ConfirmDiscardRequest, DesktopBridge } from "../contracts/platform";
import { CLOSE_SAVE_ATTEMPTS, CLOSE_SAVE_TIMEOUT_MS } from "../config/timings";
import { t } from "../i18n/index";

export interface LegacyClosePort {
  /** Завершает открытый жест так же, как отпускание пера. */
  readonly finishInput: () => void;
  readonly saveCurrent: () => Promise<boolean>;
  readonly timeoutMs?: number;
  readonly attempts?: number;
}

const saveFailedPrompt = (): ConfirmDiscardRequest => ({
  title: t("close.saveFailedTitle"), message: t("close.saveFailedMessage"),
  confirmLabel: t("close.discardAndClose"), cancelLabel: t("close.keepOpen")
});

// Закрытие окна не зависит от исправности редактора: застрявший жест
// завершается, работа сохраняется, а если сохранить не вышло — решает
// пользователь. Молчаливого отказа, после которого окно не закрыть, нет.
export function registerLegacyClose(
  bridge: DesktopBridge | undefined,
  port: LegacyClosePort
): () => void {
  if (!bridge) return () => undefined;
  return bridge.onCloseRequested(() => {
    void decideLegacyClose(port).then((decision) => bridge.resolveCloseRequest(decision),
      () => bridge.resolveCloseRequest({ action: "close" }));
  });
}

export async function decideLegacyClose(port: LegacyClosePort): Promise<CloseDecision> {
  try { port.finishInput(); } catch { /* сломанный обработчик жеста не держит окно */ }
  const saved = await saveWithin(port.saveCurrent,
    port.timeoutMs ?? CLOSE_SAVE_TIMEOUT_MS, port.attempts ?? CLOSE_SAVE_ATTEMPTS);
  return saved ? { action: "close" } : { action: "ask", prompt: saveFailedPrompt() };
}

async function saveWithin(save: () => Promise<boolean>, timeoutMs: number,
  attempts: number): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), timeoutMs);
  });
  // Правка посреди записи делает снимок устаревшим — тогда пробуем ещё раз.
  const retried = (async () => {
    for (let attempt = 0; attempt < attempts; attempt++) {
      if (await Promise.resolve().then(save).catch(() => false)) return true;
    }
    return false;
  })();
  try { return await Promise.race([retried, timeout]); }
  finally { clearTimeout(timer); }
}
