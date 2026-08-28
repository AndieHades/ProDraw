# Target contract

## Gallery persistence

`docs` remains the authoritative document store. A `gallery-index` store owns
only `id`, `kind`, `folder`, `name`, `W`, `H`, `preview`, `order`, and `updated`.
It must never contain `layers`, raster grids, masks, animation frames or source
file payloads.

`saveDoc(record)` writes the full record and its projection in one read/write
transaction. `removeDoc(id)` deletes both in one transaction. Gallery list and
folder queries read only `gallery-index`; opening, duplicating, renaming and
moving an item may load the one explicitly targeted full record.

The v1-to-v2 upgrade creates the index and walks existing records with a cursor,
projecting one value at a time. It must not call `getAll()` over the full store.

## Raster remap

Crop, Trim, rotate, flip and center continue to create independent destination
grids for Undo safety. Destination cell values pass through one operation-local
`createRasterCellInterner()`: equal RGBA values share one frozen array, and no
destination cell aliases a mutable legacy input array.

## User workflow

Direct source-bound PNG/PSD Open and Save continue unchanged. Gallery autosave
remains the recovery layer rather than a mandatory source-file format. A future
optional file-only mode is a separate product decision after this crash fix.
