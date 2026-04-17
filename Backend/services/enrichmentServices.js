const { estimateETA } = require("../utils/eta");
const { getReliabilityLabel } = require("../utils/reliability");

const enrichDonors = (donors) => {
  return donors.map(d => ({
    ...d,
    eta: estimateETA(d.distance),
    reliability_label: getReliabilityLabel(d.response_rate)
  }));
};

module.exports = { enrichDonors };