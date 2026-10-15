// Ленивая цепочка уменьшенных вдвое копий композита для мелкого зума. Это
// только презентация: RGBA документа не меняется. Уровень строится при первом
// запросе, а частичная перерисовка композита обновляет лишь свой прямоугольник.
import { makeCanvas } from "../canvas.ts";
import { mipDamageRect, mipLevelSide, unionMipBounds,
  type MipBounds } from "../../logic/view/viewportMip.ts";

type CanvasFactory = (width: number, height: number) => HTMLCanvasElement;
export interface ViewportMipSource { readonly image: CanvasImageSource;
  readonly width: number; readonly height: number }

export class ViewportMipChain {
  readonly #create: CanvasFactory;
  #levels: HTMLCanvasElement[] = [];
  #width = 0;
  #height = 0;
  #valid = 0;
  #damage: MipBounds | null = null;

  constructor(create: CanvasFactory = makeCanvas) { this.#create = create; }

  // bounds — инклюзивный прямоугольник композита; без bounds сброс всех уровней.
  invalidate(bounds: MipBounds | null = null): void {
    if (!bounds) { this.#valid = 0; this.#damage = null; return; }
    if (this.#valid) this.#damage = unionMipBounds(this.#damage, bounds);
  }

  source(base: HTMLCanvasElement, width: number, height: number,
    level: number): ViewportMipSource {
    if (width !== this.#width || height !== this.#height) this.#resize(width, height);
    if (level <= 0) return { image: base, width, height };
    for (let index = 1; index <= level; index++) this.#update(base, index);
    this.#valid = this.#damage ? level : Math.max(this.#valid, level);
    this.#damage = null;
    const factor = 2 ** level;
    return { image: this.#levels[level - 1]!, width: width / factor,
      height: height / factor };
  }

  #resize(width: number, height: number): void {
    this.#levels = []; this.#width = width; this.#height = height;
    this.#valid = 0; this.#damage = null;
  }

  #level(index: number): HTMLCanvasElement {
    const existing = this.#levels[index - 1];
    if (existing) return existing;
    const created = this.#create(mipLevelSide(this.#width, index),
      mipLevelSide(this.#height, index));
    this.#levels[index - 1] = created; return created;
  }

  #update(base: HTMLCanvasElement, index: number): void {
    const target = this.#level(index), context = target.getContext("2d");
    const source = index === 1 ? base : this.#levels[index - 2]!;
    if (!context) return;
    // Ровно вдвое билинейная выборка попадает между четырьмя пикселями: 2×2 box.
    context.imageSmoothingEnabled = true; context.imageSmoothingQuality = "low";
    if (index > this.#valid) {
      context.clearRect(0, 0, target.width, target.height);
      context.drawImage(source, 0, 0, source.width, source.height,
        0, 0, source.width / 2, source.height / 2);
      return;
    }
    const rect = this.#damage &&
      mipDamageRect(this.#damage, index, target.width, target.height);
    if (!rect) return;
    context.clearRect(rect.x, rect.y, rect.width, rect.height);
    context.drawImage(source, rect.x * 2, rect.y * 2, rect.width * 2, rect.height * 2,
      rect.x, rect.y, rect.width, rect.height);
  }
}
