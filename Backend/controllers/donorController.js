const { findMatchingDonors } = require("../services/matchingService");

// MATCH DONORS
const getDonors = (req, res) => {
  try {
    // supports both POST (req.body) and fallback GET testing
    const blood_group =
      req.body?.blood_group || req.query?.blood_group;

    if (!blood_group) {
      return res.json({
        success: false,
        message: "Blood group is required"
      });
    }

    const result = findMatchingDonors(blood_group);

    if (!result.success) {
      return res.json(result);
    }

    res.json({
      success: true,
      donors: result.donors
    });

  } catch (error) {
    console.log("ERROR:", error);
    res.json({
      success: false,
      message: "Server error"
    });
  }
};


// NOTIFY DONORS (Person A requirement: always pick top donor)
const notifyDonors = (req, res) => {
  try {
    const { donors } = req.body;

    if (!donors || donors.length === 0) {
      return res.json({
        success: false,
        message: "No donors to notify"
      });
    }

    // ✅ REQUIRED: pick top-ranked donor (index 0)
    const accepted = donors[0];

    res.json({
      success: true,
      message: "Notification sent",
      accepted_by: accepted.name,
      eta: "10 minutes"
    });

  } catch (error) {
    console.log("ERROR:", error);
    res.json({
      success: false,
      message: "Server error"
    });
  }
};


module.exports = { getDonors, notifyDonors };