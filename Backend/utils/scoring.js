const calculateScore = (donor) => {
  let score = 0;

  const distance = donor.distance || 10;
  const responseRate = donor.response_rate || 0;

  // distance (lower is better)
  score += distance;

  // availability priority
  if (donor.available) {
    score -= 10;
  } else {
    score += 5;
  }

  // response reliability
  score -= responseRate * 5;

  return Number(score.toFixed(2));
};

module.exports = { calculateScore };