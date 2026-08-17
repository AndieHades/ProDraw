import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { isTrustedRendererUrl } from "../../desktop/renderer-trust.mjs";

const packagedEntry = path.resolve("dist/index.html");

describe("renderer IPC trust", () => {
  it("accepts only the packaged renderer file", () => {
    const options = { packagedEntry, developmentUrl: null };
    expect(isTrustedRendererUrl(pathToFileURL(packagedEntry), options)).toBe(true);
    expect(isTrustedRendererUrl(pathToFileURL(path.resolve("index.html")), options)).toBe(false);
    expect(isTrustedRendererUrl("https://example.test/", options)).toBe(false);
  });

  it("accepts the exact configured development origin", () => {
    const options = { packagedEntry, developmentUrl: "http://127.0.0.1:4173/editor" };
    expect(isTrustedRendererUrl("http://127.0.0.1:4173/", options)).toBe(true);
    expect(isTrustedRendererUrl("http://127.0.0.1:4174/", options)).toBe(false);
    expect(isTrustedRendererUrl("http://evil.local:4173/", options)).toBe(false);
    expect(isTrustedRendererUrl(pathToFileURL(packagedEntry), options)).toBe(false);
  });
});
