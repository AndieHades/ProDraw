export interface SelectedPsdExportOptions {
  readonly scope: "selected";
  readonly mode: "layered";
  readonly format: "psd";
  readonly canvasBounds: "current";
  readonly includeHidden: false;
}
export const SELECTED_PSD_EXPORT_OPTIONS: Readonly<SelectedPsdExportOptions> =
  Object.freeze({ scope: "selected", mode: "layered", format: "psd",
    canvasBounds: "current", includeHidden: false });
export const exportSelectedPsd = <T>(runExport: (
  options: SelectedPsdExportOptions) => T): T => runExport(SELECTED_PSD_EXPORT_OPTIONS);
