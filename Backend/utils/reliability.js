const getReliabilityLabel = (rate) => {
  if (rate >= 0.9) return "Highly Reliable";
  if (rate >= 0.75) return "Reliable";
  return "Moderate";
};

module.exports = { getReliabilityLabel };