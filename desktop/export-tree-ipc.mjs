import { app, BrowserWindow, dialog } from "electron";
import channels from "./ipc-channels.cjs";
import { handleTrusted } from "./trusted-ipc.mjs";
import { abortExportTree, commitExportTree, createExportTreeSession,
  writeExportTreeFile } from "./export-tree-files.mjs";

const sessions = new Map();
let lastDirectory = null;
const parentWindow = (event) => BrowserWindow.fromWebContents(event.sender) ?? undefined;

function sessionFor(token) {
  const session = sessions.get(String(token));
  if (!session) throw new Error("Unknown export tree session");
  return session;
}

export function registerExportTreeIpc() {
  handleTrusted(channels.exportTreeBegin, async (event, suggestedName) => {
    const result = await dialog.showOpenDialog(parentWindow(event), {
      properties: ["openDirectory", "createDirectory"],
      defaultPath: lastDirectory ?? app.getPath("documents")
    });
    const parent = result.filePaths[0];
    if (result.canceled || !parent) return null;
    const session = await createExportTreeSession(parent, suggestedName);
    sessions.set(session.token, session); return { token: session.token };
  });
  handleTrusted(channels.exportTreeWrite, async (_event, token, relativePath, bytes) => {
    await writeExportTreeFile(sessionFor(token), relativePath, bytes); return true;
  });
  handleTrusted(channels.exportTreeCommit, async (_event, token) => {
    const session = sessionFor(token);
    const result = await commitExportTree(session); sessions.delete(session.token);
    lastDirectory = session.parent; return result;
  });
  handleTrusted(channels.exportTreeAbort, async (_event, token) => {
    const session = sessions.get(String(token)); if (!session) return false;
    sessions.delete(session.token); await abortExportTree(session); return true;
  });
}
