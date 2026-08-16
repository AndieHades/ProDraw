export type EditorEvent =
  | { readonly type: "editor.changed" }
  | { readonly type: "editor.status"; readonly key: string };

export type EditorEventListener = (event: EditorEvent) => void;
