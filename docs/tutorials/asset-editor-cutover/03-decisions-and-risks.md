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
