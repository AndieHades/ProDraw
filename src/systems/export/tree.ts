import { S } from "../../core/state.ts";
import { buildExportDocument, collectLayerIndices, exportDocumentName,
  exportTargetRoot as targetRoot } from "../../core/export/ExportTree.ts";

type State = Parameters<typeof targetRoot>[0];
const state = () => S as unknown as State;

export const exportTargetRoot = (target: Parameters<typeof targetRoot>[1],
  includeHidden = false) => targetRoot(state(), target, includeHidden);
export const buildExportDoc = (scope: Parameters<typeof buildExportDocument>[1],
  includeHidden?: boolean) => buildExportDocument(state(), scope, !!includeHidden);
export const collectIdx = (nodes: Parameters<typeof collectLayerIndices>[0],
  output = new Set<number>()) => collectLayerIndices(nodes, output);
export const docName = (): string => exportDocumentName(state());
