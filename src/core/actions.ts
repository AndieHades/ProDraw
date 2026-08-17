import type { ShellActionName } from "../contracts/shellActionCatalog.ts";

type StoredAction = (...args: never[]) => unknown;
const registry = new Map<ShellActionName, StoredAction>();

export function register<Args extends unknown[], Result>(
  name: ShellActionName, action: (...args: Args) => Result
): boolean {
  if (registry.has(name)) return false;
  registry.set(name, action as StoredAction);
  return true;
}

export function replace<Args extends unknown[], Result>(
  name: ShellActionName, action: (...args: Args) => Result
): void {
  if (!registry.has(name)) throw new Error(`Action is not registered: ${name}`);
  registry.set(name, action as StoredAction);
}

export function unregister(name: ShellActionName): boolean {
  return registry.delete(name);
}

export function has(name: ShellActionName): boolean {
  return registry.has(name);
}

export function list(): readonly ShellActionName[] {
  return [...registry.keys()];
}

export function run<Result = unknown>(
  name: ShellActionName, ...args: unknown[]
): Result | boolean {
  const action = registry.get(name);
  if (!action) return false;
  const result = (action as (...values: unknown[]) => Result)(...args);
  return result === undefined ? true : result;
}
