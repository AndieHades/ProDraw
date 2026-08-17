# Target Contract

## Effect data

`{ id, type: "monochrome", visible, opacity, params: {} }` uses the same generic
effect storage, history, clipboard and gallery contracts as other styles. It
never mutates `Layer.grid` merely by rendering or toggling visibility.

## Color result

For every non-transparent pixel:

`gray = round(0.299 * red + 0.587 * green + 0.114 * blue)`

The output is `[gray, gray, gray, alpha]`. The destructive tool calls the same
pure helper, so a fully covered brush/action result equals an enabled effect.

Layer monochrome transforms the final bounded layer style surface. Folder
monochrome transforms every rendered unit in its visible subtree, including
descendant layer/folder styles; linear Rec.601 conversion keeps the normal
source-over result equivalent without a full-document scratch canvas.

## Quick PNG

The context target becomes one visibility-filtered export root:

- layer: that layer with effective visible effects;
- folder: that folder's visible descendant tree and folder effects.

Whole canvas keeps document dimensions. Cropped mode uses non-zero alpha of the
final composite after effects. The PNG base name is the authored target name,
not the document name or a generic `layer` fallback when a name exists.
