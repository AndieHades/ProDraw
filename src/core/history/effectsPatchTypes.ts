export interface EffectsOwner {
  effects?: unknown[];
}

export interface EffectsFolder extends EffectsOwner {
  readonly id: number;
}

export interface EffectsState {
  readonly layers: EffectsOwner[];
  readonly folders: EffectsFolder[];
  readonly cur: number;
}

export type EffectsTarget =
  | { readonly kind: "layer"; readonly index: number }
  | { readonly kind: "folder"; readonly id: number };

export type EffectsTargetInput = number | EffectsOwner | EffectsTarget;

export type StoredEffectsTarget = EffectsTarget & {
  readonly effects: readonly unknown[];
};

export interface EffectsEntry {
  readonly kind: "effects-patch";
  readonly targets: readonly StoredEffectsTarget[];
}
