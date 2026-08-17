export async function runPackagedSmoke(window, timeoutMs = 60_000) {
  const result = await window.webContents.executeJavaScript(`
    new Promise((resolve, reject) => {
      const started = Date.now();
      const poll = () => {
        const value = document.documentElement.dataset.prodrawSmoke;
        if (value) { resolve(JSON.parse(value)); return; }
        if (Date.now() - started >= ${timeoutMs}) {
          reject(new Error("Renderer smoke handshake timed out")); return;
        }
        setTimeout(poll, 25);
      };
      poll();
    })
  `, true);
  if (!result?.ok) throw new Error(result?.error ?? "Renderer smoke failed");
  process.stdout.write(`Renderer ready: ${result.brushFiles} brushes, ` +
    `${result.sourceResources} sources, alpha ${result.alpha}\n`);
}
