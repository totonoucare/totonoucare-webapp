export function selectCareReconstructionContext({
  savedSnapshot = null,
  currentForecast = null,
  hasSavedReview = false,
} = {}) {
  // Once a review exists, only the care captured with that review is historical fact.
  // A current forecast may have been recalculated in place with the same id, so neither
  // id equality nor a matching date is sufficient for a safe backfill.
  if (hasSavedReview || savedSnapshot) return null;
  return currentForecast?.computed?.radar_plan_meta?.risk_context || null;
}

export function shouldCaptureDisplayedCareAtRecordSave({ existingReview = null } = {}) {
  return !existingReview?.id;
}
