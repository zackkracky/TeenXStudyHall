const { findMatchingDonors } = require("./services/matchingService");

console.log("========== TESTING START ==========");

//  VALID CASE
console.log("\n=== VALID CASE (O-) ===");
console.log(findMatchingDonors("O-"));

//  INVALID CASE
console.log("\n=== INVALID CASE (XYZ) ===");
console.log(findMatchingDonors("XYZ"));

//  EMPTY CASE (force by using rare group or editing data)
console.log("\n=== NO DONOR CASE (TEST) ===");
console.log(findMatchingDonors("AB-")); // remove AB- donors in JSON to test properly

console.log("\n========== TESTING END ==========");