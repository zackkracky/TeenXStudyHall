/**
 * Stub helper to satisfy utility contract without external API usage.
 * This function is intentionally local-only and does not call Google APIs.
 */
async function getLiveETA(origin, destination) {
  return {
    distance_km: 0,
    duration_min: 0