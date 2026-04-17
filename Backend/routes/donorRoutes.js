const express = require("express");
const router = express.Router();

const { getAllDonors, addDonor, getDonors, notifyDonors } = require("../controllers/donorController");

router.get("/donors", getAllDonors);
router.post("/donors", addDonor);
router.post("/match-donors", getDonors);
router.post("/notify", notifyDonors);

module.exports = router;