import { dialog } from "electron";

// Two-button warning whose labels come localized from the renderer.
// Cancel is the default so Enter never discards work by accident.
export async function confirmInWindow(window, request) {
  const options = {
    type: "warning", title: String(request.title), message: String(request.message),
    buttons: [String(request.confirmLabel), String(request.cancelLabel)],
    defaultId: 1, cancelId: 1, noLink: true
  };
  const result = window ? await dialog.showMessageBox(window, options) :
    await dialog.showMessageBox(options);
  return result.response === 0;
}
