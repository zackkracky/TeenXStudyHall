const { findMatchingDonors } = require("./services/matchingService");

const result = findMatchingDonors("ABC");

console.log(result);