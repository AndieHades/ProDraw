import type { DocumentDescriptor, LayerDescriptor } from "../../contracts/document";
import { RasterDocument } from "./RasterDocument";

export interface NewDocumentInput extends Omit<DocumentDescriptor, "id"> {
  readonly layerName: string;
}

export function createRasterDocument(
  input: NewDocumentInput,
  createId: () => string = () => crypto.randomUUID()
): RasterDocument {
  const document = new RasterDocument({
    id: createId(), name: input.name, width: input.width,
    height: input.height, dpi: input.dpi
  });
  const layer: LayerDescriptor = {
    id: createId(), name: input.layerName, visible: true, locked: false,
    opacity: 1, blendMode: "normal"
  };
  document.addLayer(layer);
  return document;
}
