/**
 * Placeholder ML correction model.
 * A real model can be plugged in here later using the same inputs.
 */
function predictCorrection(features = {}) {
  const base = 0;
  const distanceAdjustment = typeof features.distance_km === "number" ? Math.min(3, Math.floor(features.distance_km / 5)) : 0;
  const availabilityAdjustment = features.available === false ? 1 : 0;
  const responseAdjustment = typeof features.response_rate === "number" && features.response_rate < 0.8 ? 1 : 0;

  // Small correction based on distance and donor behavior.
  return base + distanceAdjustment + availabilityAdjustment + responseAdjustment;
}

module.exports = { predictCorrection };