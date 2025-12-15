// src/routes/funding.js
const express = require("express");
const router = express.Router();
const { jwtAuth } = require("../middlewares/auth");
const controller = require("../controllers/fundingController");

// Femme
router.post("/", jwtAuth, controller.submitFundingRequest);

// Investisseur
router.get("/", jwtAuth, controller.getAllFundingRequests);
router.put("/:id", jwtAuth, controller.reviewFunding);
// INVESTISSEUR
router.get("/funded", jwtAuth, controller.getFundedProjects);


module.exports = router;