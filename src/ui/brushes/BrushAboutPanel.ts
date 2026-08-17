import type { BrushPreset, LoadedBrush } from "../../contracts/brush";
import { t } from "../../i18n/raster/translate";

export function brushAboutPanel(preset: BrushPreset | LoadedBrush): HTMLElement[] {
  const lines: string[] = [t("studio.aboutHint")];
  if (!("compatibility" in preset)) lines.push(t("studio.aboutLoading"));
  else {
    const report = preset.compatibility;
    lines.push(`${t("studio.aboutArchive")}: ${report.archiveName ?? "—"} · ` +
      `v${report.archiveVersion ?? "—"}`);
    lines.push(`${t("studio.aboutSupported")}: ${report.supportedFields.length}`);
    if (report.unsupportedActiveFields.length) lines.push(
      `${t("studio.aboutUnsupported")}: ${report.unsupportedActiveFields.join(", ")}`);
    if (preset.warnings.length) lines.push(
      `${t("studio.aboutWarnings")}: ${preset.warnings.join(", ")}`);
    lines.push(t("studio.aboutExcluded"));
  }
  return lines.map((text) => {
    const paragraph = document.createElement("p"); paragraph.textContent = text; return paragraph;
  });
}
