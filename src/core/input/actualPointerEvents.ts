interface PointerEventLike {
  readonly clientX: number;
  readonly clientY: number;
  readonly pressure: number;
  readonly timeStamp: number;
  readonly tiltX?: number;
  readonly tiltY?: number;
}

function samePointer(left: PointerEventLike, right: PointerEventLike): boolean {
  return left.timeStamp === right.timeStamp && left.clientX === right.clientX &&
    left.clientY === right.clientY && left.pressure === right.pressure &&
    (left.tiltX ?? 0) === (right.tiltX ?? 0) && (left.tiltY ?? 0) === (right.tiltY ?? 0);
}

export function actualPointerEvents(event: PointerEvent): readonly PointerEvent[] {
  const coalesced = event.getCoalescedEvents?.() ?? [];
  if (!coalesced.length) return [event];
  return samePointer(coalesced.at(-1)!, event) ? coalesced : [...coalesced, event];
}
