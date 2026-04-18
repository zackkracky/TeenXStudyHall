const { sendSOS } = require("../controllers/sosController");
const express = require("express");
const router = express.Router();

const { getAllDonors, previewETA, addDonor, getDonors, notifyDonors } = require("../controllers/donorController");

router.get("/donors", getAllDonors);
router.get("/eta-preview", previewETA);
router.post("/donors", addDonor);
router.post("/match-donors", getDonors);
router.post("/notify", notifyDonors);
router.post("/sos", sendSOS);

module.exports = router;
