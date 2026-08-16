import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const CYRILLIC = /[\u0400-\u04FF]/;

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) return files(p);
    return entry.isFile() && entry.name.endsWith('.mjs') ? [p] : [];
  });
}

const hits = files(ROOT).flatMap((file) => {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  return lines.flatMap((line, i) => CYRILLIC.test(line) ? [`${file}:${i + 1}`] : []);
});

assert.deepEqual(hits, []);
console.log('No Cyrillic in tests passed');
