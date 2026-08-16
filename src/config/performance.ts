export const PERFORMANCE_BUDGETS = Object.freeze({
  referenceViewport: { width: 1280, height: 720 },
  maximumFilledFixtureBytes: 48 * 1024 * 1024,
  coldCompositeMilliseconds: 500,
  warmCompositeP95Milliseconds: 16,
  pointerKernelP95Milliseconds: 4,
  inputToPresentP95Milliseconds: 8,
  changedSerializationMilliseconds: 250,
  unchangedSerializationMilliseconds: 16,
  maximumTraceAllocatedBytes: 8 * 1024 * 1024,
  autosaveCopiedTilesWithoutChanges: 0
});
