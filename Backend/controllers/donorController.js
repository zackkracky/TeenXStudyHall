const fs = require("fs");
const path = require("path");
const donorsPath = path.join(__dirname, "../data/donors.json");
const donors = require("../data/donors.json");
const { findMatchingDonors } = require("../services/matchingService");

const getAllDonors = (req, res) => {
  try {
    res.json({
      success: true,
      donors
    });
  } catch (error) {
    console.log(error);
    res.json({
      success: false,
      message: "Unable to load donors"
    });
  }
};

const addDonor = (req, res) => {
  try {
    const {
      name,
      blood_group,
      location,
      phone,
      lastDonation,
      available,
      distance,
      response_rate
    } = req.body;

    if (!name || !blood_group || !location || !phone) {
      return res.json({
        success: false,
        message: "Name, blood group, location, and phone are required"
      });
    }

    const nextId = donors.reduce((max, donor) => Math.max(max, donor.id || 0), 0) + 1;
    const newDonor = {
      id: nextId,
      name,
      blood_group,
      location,
      phone,
      lastDonation: lastDonation || "First time",
      available: available === undefined ? true : Boolean(available),
      distance: typeof distance === 'number' ? distance : +(Math.random() * 5 + 1).toFixed(1),
      response_rate: typeof response_rate === 'number' ? response_rate : +(Math.random() * 0.2 + 0.75).toFixed(2)
    };

    donors.push(newDonor);
    fs.writeFileSync(donorsPath, JSON.stringify(donors, null, 2), "utf-8");

    res.json({
      success: true,
      donor: newDonor
    });
  } catch (error) {
    console.log(error);
    res.json({
      success: false,
      message: "Unable to save donor"
    });
  }
};

// MATCH DONORS
const getDonors = (req, res) => {
  try {
    const blood_group = req.body?.blood_group;

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
    console.log(error);
    res.json({
      success: false,
      message: "Server error"
    });
  }
};


// NOTIFY DONORS
const notifyDonors = (req, res) => {
  try {
    const { donors } = req.body;

    if (!donors || donors.length === 0) {
      return res.json({
        success: false,
        message: "No donors to notify"
      });
    }

    const accepted = donors[0];

    res.json({
      success: true,
      message: "Notification sent",
      accepted_by: accepted.name,
      eta: "10 minutes"
    });

  } catch (error) {
    console.log(error);
    res.json({
      success: false,
      message: "Server error"
    });
  }
};

module.exports = { getAllDonors, addDonor, getDonors, notifyDonors };