function calculateETA(donor) {
  let eta = (donor.distance / 30) * 60;

  if (!donor.available) {
    eta += 7;
  }

  if (donor.response_rate < 0.7) {
    eta += 3;
  }

  return Math.round(eta);
}

module.exports = { calculateETA };