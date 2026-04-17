const { findBestMatchWithPercentage } = require("./services/intelligenceService");

console.log("========== AI TEST ==========\n");

// 🔹 INPUT
const bloodGroup = "O+";

// 🔹 CALL AI
const result = findBestMatchWithPercentage(bloodGroup);

// 🔹 OUTPUT
if (!result.success) {
  console.log("Error:", result.message);
} else {
  console.log(`Top matches for ${bloodGroup}:\n`);

  result.donors.forEach((d, i) => {
    console.log(
      `${i + 1}. ${d.name} → ${d.match_percentage}% (Score: ${d.score})`
    );
  });

  console.log("\n🏆 BEST MATCH:");
  console.log({
    name: result.best.name,
    match_percentage: result.best.match_percentage,
    distance: result.best.distance
  });
}

console.log("\n========== TEST COMPLETE ==========");