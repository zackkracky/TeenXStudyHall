const donors = require("../data/donors.json");
const { calculateScore } = require("../utils/scoring");
const { getCoordinatesFromDonor } = require("../services/geocodingService");

// Helper functions
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c;
  return d;
}

function getDonorCoordinates(donor) {
  const coords = getCoordinatesFromDonor(donor);
  return coords ? [coords.latitude, coords.longitude] : [null, null];
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

const findMatchingDonors = (bloodGroup, userLocationStr) => {

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
  let filtered = donors.filter(
    (d) => d.blood_group === bloodGroup && d.available === true
  );

  // ✅ ADD DISTANCE
  if (userLocationStr) {
    const [lat, lng] = userLocationStr.split(',').map(Number);
    filtered = filtered.map(donor => {
      const [donorLat, donorLng] = getDonorCoordinates(donor);
      const distance = donorLat != null && donorLng != null
        ? Number(getDistanceFromLatLonInKm(lat, lng, donorLat, donorLng).toFixed(1))
        : null;

      return {
        ...donor,
        distance
      };
    });
  }

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