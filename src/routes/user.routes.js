const express = require("express");
const passport = require("passport");
const upload = require("../middlewares/multer.middleware");

const {
registerAccount,
loginUser,
logoutUser,
getUserProfile,
updateUser,
uploadProfilePicture,
deleteProfilePicture,
deleteUser,
requestPasswordReset,
renderResetPasswordPage,
resetPassword,
updateLawyerProfile,
applyForLawyer,
} = require("../controllers/user.controller.js");

const { isLoggedIn, saveRedirectUrl } = require("../middlewares/auth.middleware.js");

const router = express.Router();

// Register
router.post("/register", registerAccount);

// Login
router.post(
"/login",
saveRedirectUrl,
passport.authenticate("local", {
failureRedirect: "/login",
failureFlash: true,
}),
loginUser
);

// Logout
router.get("/logout", logoutUser);

// Profile
router.get("/profile", isLoggedIn, getUserProfile);

// Update basic fields (username, name, email) — not image
router.put("/update", isLoggedIn, updateUser);

// Profile picture management
router
.route("/profile-picture")
.post(isLoggedIn, upload.single("profilePicture"), uploadProfilePicture)
.delete(isLoggedIn, deleteProfilePicture);

// Delete account
router.delete("/delete", isLoggedIn, deleteUser);

// Apply for Lawyer
router.post("/apply-lawyer", isLoggedIn, applyForLawyer);

// Update Lawyer Profile
router.put("/update-lawyer", isLoggedIn, updateLawyerProfile);

// Password reset flow
router.post("/request-reset", requestPasswordReset);
router.get("/reset-password/:token", renderResetPasswordPage);
router.post("/reset-password", resetPassword);

// Forgot password page
router.get("/forgot-password", (req, res) => {
res.render("pages/forgot-password");
});

module.exports = router;