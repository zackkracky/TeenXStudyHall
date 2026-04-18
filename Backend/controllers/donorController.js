const fs = require("fs");
const path = require("path");
const donorsPath = path.join(__dirname, "../data/donors.json");
const donors = require("../data/donors.json");
const { findMatchingDonors } = require("../services/matchingService");
const { calculateETA } = require("../utils/eta");
const { geocodeAddress, ensureDonorsLocations, normalizeDonorOutput } = require("../services/geocodingService");

const getAllDonors = async (req, res) => {
  try {
    const updated = await ensureDonorsLocations(donors);
    if (updated) {
      fs.writeFileSync(donorsPath, JSON.stringify(donors, null, 2), "utf-8");
    }

    res.json({
      success: true,
      donors: donors.map(normalizeDonorOutput)
    });
  } catch (error) {
    console.log(error);
    res.json({
      success: false,
      message: "Unable to load donors"
    });
  }
};

const previewETA = async (req, res) => {
  try {
    const donorId = req.query?.donorId ? Number(req.query.donorId) : undefined;
    const userLocation = req.query?.userLocation || req.body?.userLocation;
    let donor = req.body?.donor;

    if (!donor && donorId) {
      donor = donors.find((d) => d.id === donorId);
    }

    if (!donor) {
      return res.json({
        success: false,
        message: "Donor ID or donor payload is required for ETA preview"
      });
    }

    const etaMinutes = calculateETA(donor);
    const eta = `${etaMinutes} mins`;
    res.json({
      success: true,
      donor: {
        id: donor.id,
        name: donor.name,
        blood_group: donor.blood_group
      },
      userLocation: userLocation || "Hyderabad, India",
      eta
    });
  } catch (error) {
    console.log(error);
    res.json({
      success: false,
      message: "Unable to compute ETA preview"
    });
  }
};

const addDonor = async (req, res) => {
  try {
    const {
      name,
      blood_group,
      location,
      lat,
      lng,
      phone,
      lastDonation,
      available,
      response_rate
    } = req.body;

    if (!name || !blood_group || !phone || (!location && lat === undefined && lng === undefined)) {
      return res.json({
        success: false,
        message: "Name, blood group, phone, and either location or lat/lng are required"
      });
    }

    const nextId = donors.reduce((max, donor) => Math.max(max, donor.id || 0), 0) + 1;
    const newDonor = {
      id: nextId,
      name,
      blood_group,
      phone,
      lastDonation: lastDonation || "First time",
      available: available === undefined ? true : Boolean(available),
      response_rate: typeof response_rate === 'number' ? response_rate : +(Math.random() * 0.2 + 0.75).toFixed(2),
      lastUpdated: new Date().toISOString()
    };

    if (location && typeof location === 'object' && location.latitude !== undefined && location.longitude !== undefined) {
      newDonor.lat = Number(location.latitude);
      newDonor.lng = Number(location.longitude);
      newDonor.location = {
        latitude: newDonor.lat,
        longitude: newDonor.lng,
        address: location.address || location.displayName || null
      };
    } else if (lat !== undefined && lng !== undefined) {
      newDonor.lat = Number(lat);
      newDonor.lng = Number(lng);
      newDonor.location = { latitude: newDonor.lat, longitude: newDonor.lng };
    }

    if (location && typeof location === 'string') {
      newDonor.location = location.trim();
      const geocoded = await geocodeAddress(newDonor.location);
      if (geocoded) {
        newDonor.lat = geocoded.latitude;
        newDonor.lng = geocoded.longitude;
        newDonor.location = { latitude: geocoded.latitude, longitude: geocoded.longitude };
      }
    }

    donors.push(newDonor);
    fs.writeFileSync(donorsPath, JSON.stringify(donors, null, 2), "utf-8");

    res.json({
      success: true,
      donor: normalizeDonorOutput(newDonor)
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
    const userLocationStr = req.body?.userLocation;

    if (!blood_group) {
      return res.json({
        success: false,
        message: "Blood group is required"
      });
    }

    const result = findMatchingDonors(blood_group, userLocationStr);

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
const notifyDonors = async (req, res) => {
  try {
    const { donors } = req.body;

    if (!donors || donors.length === 0) {
      return res.json({
        success: false,
        message: "No donors to notify"
      });
    }

    const accepted = donors[0];
    const etaMinutes = calculateETA(accepted);
    const eta = `${etaMinutes} mins`;

    res.json({
      success: true,
      message: "Notification sent",
      accepted_by: accepted.name,
      eta
    });

  } catch (error) {
    console.log(error);
    res.json({
      success: false,
      message: "Server error"
    });
  }
};

module.exports = { getAllDonors, previewETA, addDonor, getDonors, notifyDonors };
