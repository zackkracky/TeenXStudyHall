const generateInsight = (donors) => {
  if (!donors || donors.length === 0) {
    return "No suitable donors found nearby.";
  }

  const best = donors[0];

  return `Best match is ${best.name}, located ${best.distance} km away with high reliability. Fastest response expected.`;
};

module.exports = { generateInsight };