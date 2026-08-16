// Реестр обработчиков холста: инструменты (по S.tool) и режимы (кроп,
// трансформация). Система ввода диспетчеризует указатель сюда, не зная систем.
// Обработчик: { down(ctx), move(ctx), up(ctx), hover?(ctx) }, ctx = {gx, gy, e}.
const tools = new Map(), modes = new Map(), globals = [];

export const registerTool = (id, h) => tools.set(id, h);
export const registerMode = (id, h) => modes.set(id, h);
export const registerGlobal = (h) => globals.push(h);
export const toolHandler = (id) => tools.get(id);
export const modeHandler = (id) => modes.get(id);
export const globalHandlers = () => globals;
