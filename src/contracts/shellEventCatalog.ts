export const SHELL_EVENT_NAMES = [
  "animation", "before-tool-change", "before-undo",
  "brush", "brush-flags", "brushResize",
  "brushlib", "canvas-menu", "color-sync",
  "composite-ready", "cursor", "document-transition",
  "eyedropper", "fit", "grid",
  "layer-active", "layers", "locale",
  "overlay", "palette", "reference",
  "render", "selection", "selection-menu",
  "shading", "snapshot", "stroke-begin",
  "theme", "tool",
  "transform-menu", "visibility"
] as const;

export type ShellEventName = (typeof SHELL_EVENT_NAMES)[number];
