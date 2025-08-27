const express = require("express");
const router = express.Router();
const {isAdmin} = require("../middlewares/auth.middleware.js");
const {dashboardStats, adminApproveLawyer} = require("../controllers/adminDashboard.js");

router.route("/dashboard").get(isAdmin, dashboardStats);
router.route("/approve-lawyer/:id").post(isAdmin, adminApproveLawyer);

module.exports = router;