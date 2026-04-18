const { calculateETA } = require("./eta");

async function getSmartETA(donor, userLocation) {
  const etaMinutes = calculateETA(donor);
  return `${etaMinutes} mins`;
}

module.exports = { getSmartETA };