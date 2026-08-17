import type { CoverageMap } from "../../contracts/brush";

const side = 256;
const clampByte = (value: number): number => Math.max(0, Math.min(255, Math.round(value)));
const noise = (x: number, y: number, seed: number): number => {
  let value = Math.imul(x + seed, 374761393) ^ Math.imul(y - seed, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
};

function map(coverage: (x: number, y: number, px: number, py: number) => number): CoverageMap {
  const data = new Uint8Array(side * side);
  for (let py = 0; py < side; py += 1) for (let px = 0; px < side; px += 1) {
    const x = (px + 0.5) / side * 2 - 1;
    const y = (py + 0.5) / side * 2 - 1;
    data[py * side + px] = clampByte(coverage(x, y, px, py) * 255);
  }
  return { width: side, height: side, data };
}

const circle = (soft: boolean): CoverageMap => map((x, y) => {
  const distance = Math.hypot(x, y);
  if (!soft) return distance <= 0.94 ? 1 : Math.max(0, (1 - distance) / 0.06);
  return Math.max(0, 1 - Math.pow(distance, 1.7));
});

const brick = (): CoverageMap => map((x, y, px, py) => {
  const edgeNoise = (noise(px >> 2, py >> 2, 17) - 0.5) * 0.09;
  const inside = Math.max(Math.abs(x) / (0.48 + edgeNoise),
    Math.abs(y) / (0.82 + edgeNoise * 0.7));
  if (inside >= 1) return 0;
  const speck = noise(px, py, 43);
  if (speck > 0.988 || (Math.abs(y) > 0.62 && speck > 0.955)) return 0;
  return Math.min(1, (1 - inside) * 18);
});

const arterySoft = (): CoverageMap => map((x, y, px, py) => {
  const warp = (noise(px >> 3, py >> 3, 71) - 0.5) * 0.2;
  const distance = Math.hypot(x / (0.42 + warp * 0.2), y / (0.86 + warp));
  return Math.max(0, 1 - distance) * (0.82 + noise(px, py, 79) * 0.18);
});

const haggardOval = (): CoverageMap => map((x, y, px, py) => {
  const angle = Math.atan2(y, x);
  const rough = 0.08 * Math.sin(angle * 9) + (noise(px >> 2, py >> 2, 97) - 0.5) * 0.12;
  const distance = Math.hypot(x / 0.86, y / 0.58) * (1 + rough);
  if (distance >= 1 || noise(px, py, 101) > 0.982) return 0;
  return Math.min(1, (1 - distance) * 10);
});

export function builtInShapeSource(name: string): CoverageMap | null {
  if (/brush-preset-hard/i.test(name)) return circle(false);
  if (/brush-preset-soft/i.test(name)) return circle(true);
  if (/brush-pocket-brick/i.test(name)) return brick();
  if (/brush-artery-ultra-soft/i.test(name)) return arterySoft();
  if (/haggard-oval/i.test(name)) return haggardOval();
  return null;
}
