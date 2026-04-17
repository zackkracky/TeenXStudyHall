const { generateInsight } = require("./services/intelligenceService");
const { estimateETA } = require("./utils/eta");
const { getReliabilityLabel } = require("./utils/reliability");

// dummy donor data (same format as your system)
const donors = [
  {
    id: 1,
    name: "Rahul",
    blood_group: "O+",
    distance: 2.5,
    available: true,
    response_rate: 0.9,
    score: -12.5,
    rank: 1
  },
  {
    id: 2,
    name: "Anita",
    blood_group: "O+",
    distance: 4.0,
    available: true,
    response_rate: 0.75,
    score: -10,
    rank: 2
  }
];

console.log("========== AI MODULE TEST ==========\n");

// 🔹 Test Insight Generator
console.log("Insight:");
console.log(generateInsight(donors));

console.log("\n----------------------\n");

// 🔹 Test ETA
console.log("ETA for first donor:");
console.log(estimateETA(donors[0].distance));

console.log("\n----------------------\n");

// 🔹 Test Reliability Labels
console.log("Reliability Labels:");
donors.forEach(d => {
  console.log(d.name, "→", getReliabilityLabel(d.response_rate));
});

console.log("\n========== TEST COMPLETE ==========");