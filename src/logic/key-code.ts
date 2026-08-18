// Physical KeyboardEvent.code names keep shortcuts stable across layouts.
const SPECIAL: Readonly<Record<string, string>> = {
  Equal: "=", NumpadAdd: "=", Minus: "-", NumpadSubtract: "-",
  BracketLeft: "[", BracketRight: "]", Delete: "delete",
  Backspace: "backspace", Space: "space"
};

export interface KeyboardCodeEvent {
  readonly code: string;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly shiftKey?: boolean;
  readonly altKey?: boolean;
}

export function keyName(code: string): string | null {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
  if (/^(Digit|Numpad)[0-9]$/.test(code)) return code.replace(/^\D+/, "");
  return SPECIAL[code] ?? null;
}

export function keyboardCombo(event: KeyboardCodeEvent,
  spaceHeld = false): string | null {
  const key = keyName(event.code); if (!key) return null;
  return (event.ctrlKey || event.metaKey ? "mod+" : "") +
    (event.shiftKey ? "shift+" : "") + (event.altKey ? "alt+" : "") +
    (spaceHeld && key !== "space" ? "space+" : "") + key;
}

const MODIFIERS: Readonly<Record<string, string>> = {
  AltLeft: "alt", AltRight: "alt", ControlLeft: "control",
  ControlRight: "control", ShiftLeft: "shift", ShiftRight: "shift",
  MetaLeft: "meta", MetaRight: "meta"
};

export function eventKey(event: KeyboardCodeEvent): string | null {
  return keyName(event.code) ?? MODIFIERS[event.code] ?? null;
}
