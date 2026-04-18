/**
 * Apply heuristic corrections to the API ETA.
 * This layer adjusts ETA for rush hours, donor reliability, and availability.
 */
function adjustETA(apiMinutes, donor, currentTime = new Date()) {
  let adjusted = Number(apiMinutes) || 0;
  const time = currentTime instanceof Date ? currentTime : new Date(currentTime);
  const hour = time.getHours();

  // Rush hour penalty
  if ((hour >= 8 && hour < 10) || (hour >= 17 && hour < 20)) {
    adjusted += 5;
  }

  // Slower when donor response rate is low
  if (typeof donor.response_rate === "number" && donor.response_rate < 0.7) {
    adjusted += 3;
  }

  // If donor is currently unavailable, assume the ETA increases further.
  if (donor.available === false) {
    adjusted += 7;
  }

  return Math.max(1, Math.round(adjusted));
}

module.exports = { adjustETA };