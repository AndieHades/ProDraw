// Пул полноразмерных поверхностей для изолированных папок. Раньше каждая такая
// папка аллоцировала canvas размером с документ на каждом кадре: на 4K это
// около 33 MB на папку. Поверхность живёт только внутри одного draw, поэтому
// её можно вернуть в пул сразу после отрисовки.
export interface PoolSurface {
  width: number;
  height: number;
  getContext(id: "2d"): CanvasRenderingContext2D | null;
}

export interface SurfacePool<Surface extends PoolSurface> {
  borrow(width: number, height: number): Surface;
  release(surface: Surface): void;
  readonly size: number;
}

export function createSurfacePool<Surface extends PoolSurface>(
  create: (width: number, height: number) => Surface, limit = 4
): SurfacePool<Surface> {
  const free: Surface[] = [];
  return {
    get size() { return free.length; },
    borrow(width, height) {
      const surface = free.pop();
      if (!surface) return create(width, height);
      if (surface.width !== width || surface.height !== height) {
        surface.width = width; surface.height = height; return surface;
      }
      surface.getContext("2d")?.clearRect(0, 0, width, height);
      return surface;
    },
    release(surface) { if (free.length < limit) free.push(surface); }
  };
}
