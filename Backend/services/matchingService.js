const donors = require("../data/donors.json");
const { calculateScore } = require("../utils/scoring");

const findMatchingDonors = (bloodGroup) => {

  // handle invalid input
  if (!bloodGroup) {
    return {
      success: false,
      message: "Invalid blood group",
      donors: []
    };
  }

  // filter donors
  const filtered = donors.filter(
    (d) => d.blood_group === bloodGroup
  );

  // no donors case
  if (filtered.length === 0) {
    return {
      success: false,
      message: `No donors available for ${bloodGroup}`,
      donors: []
    };
  }

  // scoring
  const scored = filtered.map((donor) => ({
    ...donor,
    score: calculateScore(donor)
  }));

  // sort
  scored.sort((a, b) => a.score - b.score);

  // ranking
  const ranked = scored.map((donor, index) => ({
    ...donor,
    rank: index + 1
  }));

  // safe slice
  return {
    success: true,
    donors: ranked.slice(0, Math.min(5, ranked.length))
  };
};

module.exports = { findMatchingDonors }; // ✅ VERY IMPORTANT