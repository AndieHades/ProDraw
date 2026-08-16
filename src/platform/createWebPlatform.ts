import type { FileFilter, PlatformPort } from "../contracts/platform";

function acceptValue(filters?: readonly FileFilter[]): string {
  return filters?.flatMap((filter) => filter.extensions)
    .map((extension) => `.${extension.replace(/^\./, "")}`).join(",") ?? "";
}

async function openWithInput(filters?: readonly FileFilter[]) {
  return new Promise<File | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = acceptValue(filters);
    input.hidden = true;
    input.addEventListener("change", () => resolve(input.files?.[0] ?? null),
      { once: true });
    input.addEventListener("cancel", () => resolve(null), { once: true });
    document.body.append(input);
    input.click();
    setTimeout(() => input.remove(), 0);
  });
}

export function createWebPlatform(): PlatformPort {
  return {
    kind: "web",
    async openBinary(filters) {
      const file = await openWithInput(filters);
      if (!file) return null;
      return { name: file.name, bytes: new Uint8Array(await file.arrayBuffer()) };
    },
    async saveBinary(request) {
      const blob = new Blob([request.bytes]);
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = request.suggestedName;
      link.click();
      queueMicrotask(() => URL.revokeObjectURL(url));
      return true;
    }
  };
}
