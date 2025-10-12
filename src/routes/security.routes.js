const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middlewares/auth.middleware");
const {
    renderSecurityPage,
    updateSecuritySettings,
    changePassword,
    logoutOtherSessions,
    logoutSession,
} = require("../controllers/security.controller");

// Security page routes
router.get("/", isLoggedIn, renderSecurityPage);
router.post("/settings", isLoggedIn, updateSecuritySettings);
router.post("/change-password", isLoggedIn, changePassword);
router.post("/logout-others", isLoggedIn, logoutOtherSessions);
router.post("/logout-session/:sessionId", isLoggedIn, logoutSession);

module.exports = router;