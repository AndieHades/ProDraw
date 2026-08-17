import type { PointerContact, PointerKind } from "../../contracts/pointer";

function pointerKind(value: string): PointerKind {
  if (value === "pen" || value === "touch") return value;
  return "mouse";
}

export function pointerContact(event: PointerEvent, bounds: DOMRect): PointerContact {
  return { id: event.pointerId, kind: pointerKind(event.pointerType),
    button: event.button, buttons: event.buttons,
    x: event.clientX - bounds.left, y: event.clientY - bounds.top,
    pressure: event.pressure, tiltX: event.tiltX, tiltY: event.tiltY,
    width: event.width || 1, height: event.height || 1, time: event.timeStamp };
}
