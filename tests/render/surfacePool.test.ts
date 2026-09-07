import { describe, expect, it, vi } from "vitest";
import { createSurfacePool } from "../../src/core/render/surfacePool.ts";

function fake(width: number, height: number) {
  const clearRect = vi.fn();
  return { width, height, clearRect,
    getContext: () => ({ clearRect }) as unknown as CanvasRenderingContext2D };
}

describe("isolated surface pool", () => {
  it("creates a surface when the pool is empty and reuses it afterwards", () => {
    const create = vi.fn((w: number, h: number) => fake(w, h));
    const pool = createSurfacePool(create);
    const first = pool.borrow(64, 48);
    expect(create).toHaveBeenCalledTimes(1);
    pool.release(first);
    expect(pool.borrow(64, 48)).toBe(first);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("clears a reused surface of the same size instead of resizing it", () => {
    const pool = createSurfacePool((w: number, h: number) => fake(w, h));
    const surface = pool.borrow(64, 48);
    pool.release(surface);
    pool.borrow(64, 48);
    expect(surface.clearRect).toHaveBeenCalledWith(0, 0, 64, 48);
  });

  it("resizes a reused surface when the document size changed", () => {
    const pool = createSurfacePool((w: number, h: number) => fake(w, h));
    const surface = pool.borrow(64, 48);
    pool.release(surface);
    const next = pool.borrow(128, 96);
    expect(next).toBe(surface);
    expect({ width: next.width, height: next.height })
      .toEqual({ width: 128, height: 96 });
    expect(surface.clearRect).not.toHaveBeenCalled();
  });

  it("nests like a stack and stops growing past its limit", () => {
    const pool = createSurfacePool((w: number, h: number) => fake(w, h), 2);
    const outer = pool.borrow(8, 8), inner = pool.borrow(8, 8);
    pool.release(inner); pool.release(outer);
    expect(pool.size).toBe(2);
    pool.release(fake(8, 8));
    expect(pool.size).toBe(2);
    expect(pool.borrow(8, 8)).toBe(outer);
  });
});
