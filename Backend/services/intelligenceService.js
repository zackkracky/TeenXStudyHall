const donors = require("../data/donors.json");
const { calculateScore } = require("../utils/scoring");

// 🔹 MAIN AI PIPELINE
const findBestMatchWithPercentage = (bloodGroup) => {

  // Step 1: filter
  const filtered = donors.filter(d => d.blood_group === bloodGroup);

  if (!filtered.length) {
    return {
      success: false,
      message: "No donors found",
      donors: []
    };
  }

  // Step 2: score
  const scored = filtered.map(d => ({
    ...d,
    score: calculateScore(d)
  }));

  // Step 3: sort
  scored.sort((a, b) => a.score - b.score);

  // Step 4: top 10
  const top10 = scored.slice(0, Math.min(10, scored.length));

  // Step 5: normalize to percentage
  const minScore = top10[0].score;
  const maxScore = top10[top10.length - 1].score;

  const withPercentage = top10.map(d => {
    let percent;

    if (maxScore === minScore) {
      percent = 100;
    } else {
      percent = 100 * (1 - (d.score - minScore) / (maxScore - minScore));
    }

    return {
      ...d,
      match_percentage: Math.round(percent)
    };
  });

  return {
    success: true,
    donors: withPercentage,
    best: withPercentage[0]
  };
};

module.exports = { findBestMatchWithPercentage };