const express = require("express");
const router = express.Router();

const { getDonors, notifyDonors } = require("../controllers/donorController");

router.post("/match-donors", getDonors);   // ✅ MUST be POST
router.post("/notify", notifyDonors);

module.exports = router;