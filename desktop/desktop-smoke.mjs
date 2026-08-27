export async function runPackagedSmoke(window, timeoutMs = 60_000) {
  const result = await window.webContents.executeJavaScript(`
    new Promise((resolve, reject) => {
      const started = Date.now();
      const poll = () => {
        const value = document.documentElement.dataset.prodrawSmoke;
        if (value) { resolve(JSON.parse(value)); return; }
        if (Date.now() - started >= ${timeoutMs}) {
          const scripts = [...document.scripts].map((script) => script.src);
          const details = { href: location.href, readyState: document.readyState,
            bridge: !!window.prodrawDesktop, workspace: !!document.querySelector("#paint-canvas, #cv"),
            scripts };
          reject(new Error("Renderer smoke handshake timed out: " +
            JSON.stringify(details))); return;
        }
        setTimeout(poll, 25);
      };
      poll();
    })
  `, true);
  if (!result?.ok) throw new Error(result?.error ?? "Renderer smoke failed");
  process.stdout.write(`Renderer ready: workspace ${result.workspace}, ` +
    `file tree ${result.fileTree}, alpha ${result.alpha}\n`);
}
