export function brushFileName(name: string, id: string, revision: number): string {
  const stem = name.trim().replace(/[<>:"/\\|?*]/g, "_")
    .replace(/[. ]+$/g, "").slice(0, 72) || "Brush";
  const suffix = id.replace(/[^a-z0-9]/gi, "").slice(0, 8) || "custom";
  return `${stem}-${suffix}-r${revision}.prodraw-brush`;
}
