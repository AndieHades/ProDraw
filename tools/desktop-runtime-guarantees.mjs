import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Buffer } from "node:buffer";
import { atomicWriteFile } from "../desktop/atomic-file.mjs";
import { isTrustedRendererUrl } from "../desktop/renderer-trust.mjs";

// Renderer trust and atomic replace are runtime guarantees rather than shell
// wiring, so they are proved by executing them instead of reading source text.
export async function desktopRuntimeGuaranteeErrors() {
  const errors = [];
  const packagedEntry = path.resolve("dist/index.html");
  const trustOptions = { packagedEntry, developmentUrl: null };
  if (!isTrustedRendererUrl(new URL(`file:///${packagedEntry.replaceAll("\\", "/")}`),
    trustOptions)) errors.push("packaged renderer entry must be trusted");
  if (isTrustedRendererUrl(new URL(`file:///${path.resolve("index.html").replaceAll("\\", "/")}`),
    trustOptions)) errors.push("a sibling file renderer must be rejected");
  const devTrust = { packagedEntry, developmentUrl: "http://127.0.0.1:4173/editor" };
  if (!isTrustedRendererUrl("http://127.0.0.1:4173/", devTrust)) {
    errors.push("exact development origin must be trusted");
  }
  for (const candidate of ["http://127.0.0.1:4174/", "http://evil.local:4173/",
    `file:///${packagedEntry.replaceAll("\\", "/")}`]) {
    if (isTrustedRendererUrl(candidate, devTrust)) errors.push(`untrusted renderer accepted: ${candidate}`);
  }

  const atomicDirectory = await mkdtemp(path.join(tmpdir(), "prodraw-atomic-check-"));
  try {
    const target = path.join(atomicDirectory, "work.prodraw");
    await atomicWriteFile(target, Uint8Array.from([1, 2, 3]));
    await atomicWriteFile(target, Uint8Array.from([7, 8, 9, 10]));
    const bytes = await readFile(target);
    if (!bytes.equals(Buffer.from([7, 8, 9, 10]))) errors.push("atomic replace bytes differ");
    if ((await readdir(atomicDirectory)).some((name) => name.endsWith(".tmp"))) {
      errors.push("atomic replace left a temporary file");
    }
  } finally {
    if (path.dirname(atomicDirectory) === path.resolve(tmpdir()) &&
        path.basename(atomicDirectory).startsWith("prodraw-atomic-check-")) {
      await rm(atomicDirectory, { recursive: true, force: true });
    }
  }
  return errors;
}
