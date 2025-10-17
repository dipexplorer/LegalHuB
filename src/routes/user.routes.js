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
    toggleUserStatus,
} = require("../controllers/user.controller.js");
const { isLoggedIn, saveRedirectUrl } = require("../middlewares/auth.middleware.js");

const router = express.Router();

// Register
router.route("/register").post(registerAccount);

const { trackLoginActivity } = require("../controllers/security.controller.js");

// Login
router.post(
    "/login",
    saveRedirectUrl,
    passport.authenticate("local", {
        failureRedirect: "/login",
        failureFlash: true,
    }),
    trackLoginActivity,
    loginUser
);

// Logout
router.route("/logout").get(logoutUser);

// Profile
router.route("/profile").get(isLoggedIn, getUserProfile);

// Update - with profile picture upload
router.route("/update").put(isLoggedIn, updateUser);

// Profile picture management
router
    .route("/profile-picture")
    .post(isLoggedIn, upload.single("profilePicture"), uploadProfilePicture);
router.route("/profile-picture").delete(isLoggedIn, deleteProfilePicture);

// Delete
router.route("/delete").delete(isLoggedIn, deleteUser);

// Apply for Lawyer
router.route("/apply-lawyer").post(isLoggedIn, applyForLawyer);

// Update Lawyer Profile - with profile picture upload
router.route("/update-lawyer").put(isLoggedIn, updateLawyerProfile);

// Request password reset (email form submission)
router.post("/request-reset", requestPasswordReset);

// Reset password form (via token in URL)
router.get("/reset-password/:token", renderResetPasswordPage);

// Submit new password (after user enters new password)
router.post("/reset-password", resetPassword);

router.get("/forgot-password", (req, res) => {
    res.render("pages/forgot-password");
});

// toggle user status
router.route("/toggle-active").post(toggleUserStatus);
// 🔹 Google OAuth Routes
router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
    "/auth/google/callback",
    passport.authenticate("google", {
        failureRedirect: "/login",
        failureFlash: true,
    }),
    (req, res) => {
        // Successful login/signup with Google → redirect to profile or dashboard
        res.redirect("/profile");
    }
);
module.exports = router;
