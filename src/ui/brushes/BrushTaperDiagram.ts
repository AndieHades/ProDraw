import type { BrushPreset, LoadedBrush } from "../../contracts/brush";

export function brushTaperDiagram(brush: BrushPreset | LoadedBrush): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.className = "studio-taper-diagram"; canvas.width = 420; canvas.height = 74;
  const context = canvas.getContext("2d"); if (!context) return canvas;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(235,235,242,.74)";
  const center = canvas.height / 2;
  const start = Math.max(6, brush.taper.start * canvas.width * 0.35);
  const end = Math.max(6, brush.taper.end * canvas.width * 0.35);
  const minimum = Math.max(1, (1 - brush.taper.size) * 15);
  const maximum = 16;
  const sharpness = 1 + brush.taper.tip * 5;
  context.beginPath();
  for (let x = 0; x <= canvas.width; x += 2) {
    const left = Math.pow(Math.min(1, x / start), sharpness);
    const right = Math.pow(Math.min(1, (canvas.width - x) / end), sharpness);
    const radius = minimum + (maximum - minimum) * Math.min(left, right);
    if (x === 0) context.moveTo(x, center - radius); else context.lineTo(x, center - radius);
  }
  for (let x = canvas.width; x >= 0; x -= 2) {
    const left = Math.pow(Math.min(1, x / start), sharpness);
    const right = Math.pow(Math.min(1, (canvas.width - x) / end), sharpness);
    const radius = minimum + (maximum - minimum) * Math.min(left, right);
    context.lineTo(x, center + radius);
  }
  context.closePath(); context.fill(); return canvas;
}
