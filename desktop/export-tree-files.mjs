import { access, mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { atomicWriteFile } from "./atomic-file.mjs";

const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
const INVALID = '<>:"/\\|?*';

export function safeExportSegment(value, fallback = "item") {
  let segment = Array.from(String(value).trim(), (character) =>
    character.charCodeAt(0) < 32 || INVALID.includes(character) ? "_" : character)
    .join("").replace(/[. ]+$/g, "");
  segment = Array.from(segment).slice(0, 96).join("") || fallback;
  return RESERVED.test(segment) ? `_${segment}` : segment;
}

function assertInside(root, target) {
  const relative = path.relative(root, target);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative)) throw new Error("Export path escapes its session root");
}

function safeRequestedSegment(value) {
  const raw = String(value);
  const safe = safeExportSegment(raw);
  if (safe !== raw || path.basename(raw) !== raw) throw new Error("Invalid export path segment");
  return safe;
}

export function exportTreeTarget(session, requestedPath) {
  if (!Array.isArray(requestedPath) || !requestedPath.length || requestedPath.length > 64) {
    throw new Error("Invalid export path");
  }
  const segments = requestedPath.map(safeRequestedSegment);
  if (!/\.png$/i.test(segments.at(-1))) throw new Error("Export tree accepts PNG files only");
  const target = path.resolve(session.staging, ...segments);
  assertInside(session.staging, target); return target;
}

export async function createExportTreeSession(parent, suggestedName) {
  const resolvedParent = path.resolve(parent);
  const staging = path.join(resolvedParent, `.prodraw-export-${randomUUID()}`);
  await mkdir(staging);
  return { token: randomUUID(), parent: resolvedParent, staging,
    rootName: safeExportSegment(suggestedName, "Folder") };
}

export async function writeExportTreeFile(session, requestedPath, bytes) {
  if (!bytes || typeof bytes.byteLength !== "number") throw new Error("Invalid PNG payload");
  await atomicWriteFile(exportTreeTarget(session, requestedPath), bytes);
}

async function exists(target) {
  try { await access(target); return true; }
  catch (error) { if (error?.code === "ENOENT") return false; throw error; }
}

export async function commitExportTree(session) {
  for (let index = 1; index < 10000; index++) {
    const name = index === 1 ? session.rootName : `${session.rootName}_${index}`;
    const target = path.join(session.parent, name);
    if (await exists(target)) continue;
    try { await rename(session.staging, target); return { name, location: target }; }
    catch (error) { if (new Set(["EEXIST", "ENOTEMPTY", "EPERM"]).has(error?.code)) continue;
      throw error; }
  }
  throw new Error("Could not publish export directory");
}

export async function abortExportTree(session) {
  assertInside(session.parent, session.staging);
  if (!path.basename(session.staging).startsWith(".prodraw-export-")) {
    throw new Error("Invalid export staging directory");
  }
  await rm(session.staging, { recursive: true, force: true });
}
