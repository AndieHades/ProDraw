import { S } from '../../core/state.js';
import { buildExportDocument, collectLayerIndices, exportDocumentName,
  exportTargetRoot as targetRoot } from '../../core/export/ExportTree.ts';

export const exportTargetRoot = (target, includeHidden = false) =>
  targetRoot(S, target, includeHidden);
export const buildExportDoc = (scope, includeHidden) =>
  buildExportDocument(S, scope, !!includeHidden);
export const collectIdx = (nodes, output = new Set()) =>
  collectLayerIndices(nodes, output);
export const docName = () => exportDocumentName(S);
