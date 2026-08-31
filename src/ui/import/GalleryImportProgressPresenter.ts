import {
  GALLERY_IMPORT_PROGRESS_DELAY_MS,
  GALLERY_IMPORT_STAGE_PERCENT,
  GALLERY_IMPORT_UI_COMMIT_TIMEOUT_MS,
  type GalleryImportStage,
} from "../../config/import-progress.ts";
import type { GalleryImportProgress } from
  "../../core/import/GalleryImportProgressRunner.ts";
import { t } from "../../i18n/index.ts";

const STAGE_KEYS: Record<GalleryImportStage, string> = {
  checking: "gallery.importProgressChecking",
  decoding: "gallery.importProgressDecoding",
  preparing: "gallery.importProgressPreparing",
  saving: "gallery.importProgressSaving",
  opening: "gallery.importProgressOpening",
  complete: "gallery.importProgressComplete",
};

let sequence = 0;
let activeId = 0;
let revealTimer: ReturnType<typeof setTimeout> | null = null;

const element = (id: string): HTMLElement | null => document.getElementById(id);

function hide(id: number): void {
  if (id !== activeId) return;
  if (revealTimer !== null) clearTimeout(revealTimer);
  revealTimer = null;
  const overlay = element("gal-import-progress");
  overlay?.classList.remove("on", "pending");
  overlay?.setAttribute("aria-hidden", "true");
  element("gallery")?.setAttribute("aria-busy", "false");
}

function render(stage: GalleryImportStage): void {
  const percent = GALLERY_IMPORT_STAGE_PERCENT[stage];
  const label = t(STAGE_KEYS[stage]);
  const meter = element("gal-import-progress-meter");
  const stageElement = element("gal-import-progress-stage");
  const percentElement = element("gal-import-progress-percent");
  if (stageElement) stageElement.textContent = label;
  if (percentElement) percentElement.textContent = `${percent}%`;
  meter?.style.setProperty("--gallery-import-progress", `${percent}%`);
  meter?.setAttribute("aria-valuenow", String(percent));
  meter?.setAttribute("aria-valuetext", `${label} ${percent}%`);
}

export function beginGalleryImportProgress(
  fileName: string,
  delayMs = GALLERY_IMPORT_PROGRESS_DELAY_MS,
): GalleryImportProgress {
  const id = ++sequence;
  activeId = id;
  if (revealTimer !== null) clearTimeout(revealTimer);
  const overlay = element("gal-import-progress");
  if (overlay) {
    overlay.classList.remove("on", "pending");
    void overlay.offsetWidth;
    overlay.style.setProperty("--gallery-import-progress-delay", `${delayMs}ms`);
    overlay.classList.add("pending");
    overlay.setAttribute("aria-hidden", "true");
  }
  element("gallery")?.setAttribute("aria-busy", "false");
  const nameElement = element("gal-import-progress-name");
  if (nameElement) nameElement.textContent = fileName;
  let stage: GalleryImportStage = "checking";
  let finished = false;
  render(stage);
  revealTimer = setTimeout(() => {
    if (id !== activeId || finished) return;
    overlay?.classList.remove("pending");
    overlay?.classList.add("on");
    overlay?.setAttribute("aria-hidden", "false");
    element("gallery")?.setAttribute("aria-busy", "true");
  }, delayMs);
  return {
    ready() {
      return new Promise((resolve) => {
        let settled = false;
        const fallback = setTimeout(finish, GALLERY_IMPORT_UI_COMMIT_TIMEOUT_MS);
        function finish() {
          if (settled) return;
          settled = true;
          clearTimeout(fallback);
          resolve();
        }
        if (typeof requestAnimationFrame === "function") {
          requestAnimationFrame(() => requestAnimationFrame(finish));
        }
      });
    },
    stage(value) {
      if (id !== activeId || finished ||
        GALLERY_IMPORT_STAGE_PERCENT[value] < GALLERY_IMPORT_STAGE_PERCENT[stage]) return;
      stage = value;
      render(stage);
    },
    finish(success) {
      if (id !== activeId || finished) return;
      finished = true;
      if (success) render("complete");
      hide(id);
    },
  };
}
