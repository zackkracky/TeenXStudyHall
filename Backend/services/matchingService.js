const donors = require("../data/donors.json");
const { calculateScore } = require("../utils/scoring");

const findMatchingDonors = (bloodGroup) => {

  console.log("\n🔍 Incoming request for:", bloodGroup);

  // ✅ VALIDATION
  const validBloodGroups = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

  if (!bloodGroup || !validBloodGroups.includes(bloodGroup)) {
    console.log("❌ Invalid blood group");
    return {
      success: false,
      message: "Invalid blood group",
      donors: []
    };
  }

  // ✅ FILTER
  const filtered = donors.filter(
    (d) => d.blood_group === bloodGroup && d.available === true
  );

  console.log("📊 Filtered donors:", filtered.length);

  // ✅ NO DONORS
  if (filtered.length === 0) {
    console.log("⚠️ No donors found");
    return {
      success: false,
      message: `No donors available for ${bloodGroup}`,
      donors: []
    };
  }

  // ✅ SCORING
  const scored = filtered.map((donor) => ({
    ...donor,
    score: calculateScore(donor)
  }));

  // ✅ SORT
  scored.sort((a, b) => a.score - b.score);

  // ✅ RANKING
  const ranked = scored.map((donor, index) => ({
    ...donor,
    rank: index + 1
  }));

  const topDonors = ranked.slice(0, Math.min(5, ranked.length));

  console.log("🏆 Top donors:", topDonors.map(d => d.name));

  // ✅ FINAL OUTPUT
  return {
    success: true,
    donors: topDonors
  };
};

module.exports = { findMatchingDonors };