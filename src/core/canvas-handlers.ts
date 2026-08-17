// Typed registry shared by pointer input and canvas tools. The handler payload
// stays opaque here because each tool owns its more specific pointer contract.
export interface CanvasHandler {
  readonly down?: (context: unknown) => unknown;
  readonly move?: (context: unknown) => unknown;
  readonly up?: (context: unknown) => unknown;
  readonly hover?: (context: unknown) => unknown;
  readonly cancel?: (context: unknown) => unknown;
}

const tools = new Map<string, CanvasHandler>();
const modes = new Map<string, CanvasHandler>();
const globals: CanvasHandler[] = [];

export const registerTool = (id: string, handler: CanvasHandler): Map<string, CanvasHandler> =>
  tools.set(id, handler);
export const registerMode = (id: string, handler: CanvasHandler): Map<string, CanvasHandler> =>
  modes.set(id, handler);
export const registerGlobal = (handler: CanvasHandler): number => globals.push(handler);
export const toolHandler = (id: string): CanvasHandler | undefined => tools.get(id);
export const modeHandler = (id: string): CanvasHandler | undefined => modes.get(id);
export const globalHandlers = (): readonly CanvasHandler[] => globals;
