import type { PointerContact } from "../../contracts/pointer";
import { POINTER_INPUT } from "../../config/input";

export function isPalmContact(contact: Pick<PointerContact, "kind" | "width" | "height">): boolean {
  return contact.kind === "touch" &&
    Math.max(contact.width, contact.height) >= POINTER_INPUT.palmContactPixels;
}

export function canPaintContact(contact: PointerContact, fingerPaint: boolean): boolean {
  if (contact.kind === "mouse") return contact.button === 0;
  if (contact.kind === "pen") return true;
  return fingerPaint && !isPalmContact(contact);
}

export function canNavigateTouch(contact: PointerContact): boolean {
  return contact.kind === "touch" && !isPalmContact(contact);
}
