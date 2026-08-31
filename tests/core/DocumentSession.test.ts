import { describe, expect, it } from "vitest";
import { DocumentSession,
  isDocumentGenerationToken } from "../../src/core/session/DocumentSession";

describe("document session", () => {
  it("identifies the persisted generation-token contract", () => {
    const token = new DocumentSession().supersede();
    expect(isDocumentGenerationToken(token)).toBe(true);
    expect(isDocumentGenerationToken(17)).toBe(false);
    expect(isDocumentGenerationToken({ generation: 1.5 })).toBe(false);
  });

  it("owns dirty and saved state for the active document", () => {
    const session = new DocumentSession();
    session.activateNew("one");
    expect(session.dirty).toBe(true);
    const initial = session.captureSave();
    expect(initial && session.markSaved(initial)).toBe(true);
    expect(session.dirty).toBe(false);
    session.markDirty();
    expect(session.dirty).toBe(true);
  });

  it("does not let a late save mark a newer revision saved", () => {
    const session = new DocumentSession();
    session.activateNew("one");
    const stale = session.captureSave();
    session.markDirty();
    expect(stale && session.markSaved(stale)).toBe(false);
    expect(session.dirty).toBe(true);
  });

  it("supersedes late open and import operations", () => {
    const session = new DocumentSession();
    session.activateNew("one");
    const stale = session.supersede();
    const current = session.supersede();
    expect(session.activate(stale, "stale", null, true)).toBe(false);
    expect(session.activate(current, "current", "folder", true)).toBe(true);
    expect(session.id).toBe("current");
    expect(session.folder).toBe("folder");
    expect(session.dirty).toBe(false);
  });

  it("does not let an old document save affect its replacement", () => {
    const session = new DocumentSession();
    session.activateNew("one");
    const stale = session.captureSave();
    session.activateNew("two");
    expect(stale && session.markSaved(stale)).toBe(false);
    expect(session.id).toBe("two");
    expect(session.dirty).toBe(true);
  });
});
