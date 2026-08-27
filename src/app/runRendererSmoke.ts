interface SmokeResult {
  readonly ok: boolean;
  readonly workspace?: boolean;
  readonly alpha?: number;
  readonly fileTree?: boolean;
  readonly error?: string;
}

function report(result: SmokeResult): void {
  document.documentElement.dataset.prodrawSmoke = JSON.stringify(result);
}

export function rendererSmokeRequested(): boolean {
  return new URLSearchParams(window.location.search).get("smoke") === "1";
}

export function reportRendererSmokeFailure(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  report({ ok: false, error: message });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

async function proveIndexedDb(alpha: number): Promise<void> {
  const opened = indexedDB.open("prodraw-desktop-smoke", 1);
  opened.onupgradeneeded = () => opened.result.createObjectStore("proof", { keyPath: "id" });
  const database = await requestResult(opened);
  try {
    const write = database.transaction("proof", "readwrite");
    write.objectStore("proof").put({ id: "rgba", alpha }); await transactionDone(write);
    const read = database.transaction("proof", "readonly");
    const restored = await requestResult(read.objectStore("proof").get("rgba"));
    if (restored?.alpha !== alpha) throw new Error("IndexedDB smoke round trip differs");
  } finally {
    database.close(); indexedDB.deleteDatabase("prodraw-desktop-smoke");
  }
}

function proveRgbaCanvas(alpha: number): void {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1;
  const context = canvas.getContext("2d"); if (!context) throw new Error("Canvas is unavailable");
  const pixel = context.createImageData(1, 1); pixel.data.set([19, 37, 71, alpha]);
  context.putImageData(pixel, 0, 0);
  if (context.getImageData(0, 0, 1, 1).data[3] !== alpha) {
    throw new Error("RGBA canvas round trip differs");
  }
}

export async function runRendererSmoke(..._unused: unknown[]): Promise<void> {
  if (!window.prodrawDesktop) throw new Error("Desktop preload bridge is unavailable");
  if (!window.prodrawDesktop.fileTree) throw new Error("Desktop export tree bridge is unavailable");
  if (!document.querySelector("#cv") || !document.querySelector("#gallery") ||
      !document.querySelector("#lay-list")) throw new Error("Editor workspace did not mount");
  const alpha = 137; proveRgbaCanvas(alpha); await proveIndexedDb(alpha);
  report({ ok: true, workspace: true, alpha, fileTree: true });
}
