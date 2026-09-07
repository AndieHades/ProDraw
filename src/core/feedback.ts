// Короткое сообщение пользователю. Оболочка подписывает на событие `feedback`
// свой презентер, поэтому systems и core сообщают о результате командой, а не
// импортом UI.
import * as bus from "./bus.ts";

export const toast = (message: string): void => bus.emit("feedback", message);
