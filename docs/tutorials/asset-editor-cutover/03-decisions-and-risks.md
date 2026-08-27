# Decisions and risks

The cutover removes ownership paths rather than making a hidden empty brush
provider. This avoids a selected-brush startup requirement and prevents a
future UI action from lazily restoring a brush dependency.

The basic Pencil/Eraser, primitive, fill, transform, selection and effects
tools are retained. Brush-only behavior and controls are removed; this keeps
the lightweight asset workflow usable without loading the brush engine.

The live shell is grid-backed while typed RGBA systems are an incomplete
parallel migration. The production cutover therefore becomes `shell` mode:
the preserved shell no longer loads its detached typed brush bridge. The task
does not rewrite PSD, gallery, layer or export ownership. Focused tests prove
their existing boundaries after bootstrap removal; screenshot comparison is
deliberately omitted by request.

The folder PNG-tree action reuses `ExportDocument`, standalone full-canvas layer
rendering and the staged file-tree writer. Standalone rendering deliberately
does not consult layer or ancestor-folder visibility. It does not use the normal
multi-file `saveFile` loop, because that contract may prompt once per file.
The staged root is committed only after every PNG and empty directory succeeds;
failure aborts the unpublished tree. Files are rendered and encoded one at a
time so layer count does not multiply retained raster memory.
