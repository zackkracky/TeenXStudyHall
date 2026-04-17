const { findMatchingDonors } = require("../services/matchingService");

// MATCH DONORS
const getDonors = (req, res) => {
  try {
    const { blood_group } = req.body;

    if (!blood_group) {
      return res.status(400).json({
        success: false,
        message: "Blood group is required"
      });
    }

    const result = findMatchingDonors(blood_group);

    // check success
    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json({
      success: true,
      donors: result.donors
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

module.exports = { getDonors };