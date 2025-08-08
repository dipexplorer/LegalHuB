const express = require("express");
const passport = require("passport");
const {
    registerUser,
    loginUser,
    logoutUser,
    getUserProfile,
    updateUser,
    deleteUser,
    requestPasswordReset,
    renderResetPasswordPage,
    resetPassword
} = require("../controllers/user.controller.js");
const {
    isLoggedIn,
    saveRedirectUrl,
} = require("../middlewares/auth.middleware.js");

const router = express.Router();

// Register
router.route("/register").post(registerUser);

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
router.route("/logout").get(logoutUser);

// Profile
router.route("/profile").get(isLoggedIn, getUserProfile);

// Update
router.route("/update").put(isLoggedIn, updateUser);

// Delete
router.route("/delete").delete(isLoggedIn, deleteUser);

// ---------------------------
// Forgot/Reset Password Routes
// ---------------------------

// Request password reset (email form submission)
router.post('/request-reset', requestPasswordReset);

// Reset password form (via token in URL)
router.get('/reset-password/:token', renderResetPasswordPage);

// Submit new password (after user enters new password)
router.post('/reset-password', resetPassword);

router.get('/forgot-password', (req, res) => {
  res.render('pages/forgot-password');
});


module.exports = router;
