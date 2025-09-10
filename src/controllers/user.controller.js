const User = require("../models/user.model.js");
const LawyerProfile = require("../models/lawyer.model.js");
const asyncHandler = require("../utils/asyncHandler.js");
const apiResponse = require("../utils/apiResponse.js");
const apiError = require("../utils/apiError.js");
const passport = require("passport");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const validatePassword = require("../validators/passwordValidator.js");
const cloudinary = require("../config/cloudinary.js");
const { deleteFromCloudinary } = require("../utils/cloudinary.js");

const DEFAULT_AVATAR =
    "https://cdn.vectorstock.com/i/1000v/51/87/student-avatar-user-profile-icon-vector-47025187.jpg";

// Nodemailer setup
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

/* ------------------- REGISTER ACCOUNT ------------------- */
const registerAccount = asyncHandler(async (req, res) => {
    const { username, email, password, confirmPassword, role, lawyerProfile } = req.body;

    const allowedRoles = ["user", "lawyer"];
    if (!allowedRoles.includes(role)) {
        req.flash("error", "Invalid role");
        return res.redirect("/login");
    }

    if (!username || !email || !password || !confirmPassword) {
        req.flash("error", "All fields are required");
        return res.redirect("/login");
    }

    const strength = validatePassword(password);
    if (strength.errors.length > 0) {
        req.flash("error", strength.errors.join(", "));
        return res.redirect("/register");
    }

    if (password !== confirmPassword) {
        req.flash("error", "Passwords do not match");
        return res.redirect("/login");
    }

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
        req.flash("error", "User with given email or username already exists");
        return res.redirect("/login");
    }

    try {
        const newUser = new User({ username, email, role: role || "user" });
        const registeredUser = await User.register(newUser, password);

        if (registeredUser.role === "lawyer") {
            if (!lawyerProfile?.specialization || !lawyerProfile?.licenseNumber) {
                req.flash("error", "Specialization and license number are required");
                return res.redirect("/login");
            }

            const newLawyerProfile = new LawyerProfile({
                user: registeredUser._id,
                ...lawyerProfile,
            });
            await newLawyerProfile.save();
            registeredUser.lawyerProfile = newLawyerProfile._id;
            await registeredUser.save();
        }

        req.login(registeredUser, (err) => {
            if (err) {
                req.flash("error", "Login failed after registration");
                return res.redirect("/login");
            }
            req.flash("success", "Welcome! Account created successfully.");
            return res.redirect("/");
        });
    } catch (err) {
        req.flash("error", err.message);
        return res.redirect("/login");
    }
});

/* ------------------- LOGIN ------------------- */
const loginUser = asyncHandler(async (req, res) => {
    req.flash("success", "Logged in successfully!");
    return res.redirect("/");
});

/* ------------------- LOGOUT ------------------- */
const logoutUser = asyncHandler(async (req, res, next) => {
    if (!req.session) return next(new apiError(500, "Session not found"));

    req.logout((err) => {
        if (err) return next(new apiError(500, "Logout failed"));

        req.flash("success", "Logged out successfully!");
        res.clearCookie("connect.sid");
        return res.redirect("/");
    });
});

/* ------------------- GOOGLE AUTH ------------------- */
// Redirect to Google login
const googleAuth = passport.authenticate("google", {
    scope: ["profile", "email"],
});

// Google OAuth callback
const googleCallback = (req, res, next) => {
    passport.authenticate("google", { failureRedirect: "/login", failureFlash: true }, async (err, user) => {
        if (err) {
            req.flash("error", "Google authentication failed");
            return res.redirect("/login");
        }
        if (!user) {
            req.flash("error", "No user found");
            return res.redirect("/login");
        }

        req.login(user, (loginErr) => {
            if (loginErr) {
                req.flash("error", "Login failed after Google authentication");
                return res.redirect("/login");
            }
            req.flash("success", "Logged in with Google!");
            return res.redirect("/");
        });
    })(req, res, next);
};

/* ------------------- PROFILE ------------------- */
const getUserProfile = asyncHandler(async (req, res) => {
    if (!req.user) return res.redirect("/login");

    const user = await User.findById(req.user._id).select("-password").populate("lawyerProfile");
    if (!user) return res.redirect("/login");

    if (req.accepts("html")) {
        return res.render("users/profile", { user });
    }
    return res.status(200).json(new apiResponse(200, user, "User profile fetched successfully"));
});

/* ------------------- RENDER FORMS ------------------- */
const renderUpdateForm = asyncHandler(async (req, res) => {
    if (!req.user) return res.redirect("/login");
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.redirect("/login");
    res.render("users/updateUser", { user });
});

const renderLawyerUpdateForm = asyncHandler(async (req, res) => {
    if (!req.user) return res.redirect("/login");
    const user = await User.findById(req.user._id).select("-password").populate("lawyerProfile");
    if (!user || user.role !== "lawyer") {
        req.flash("error", "You must be logged in as a lawyer to access this page");
        return res.redirect("/login");
    }
    res.render("users/updateLawyer", { user, lawyerProfile: user.lawyerProfile });
});

/* ------------------- UPDATE USER ------------------- */
const updateUser = asyncHandler(async (req, res) => {
    const { username, name, email } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) {
        req.flash("error", "Please login.");
        return res.redirect("/login");
    }

    if (username && username !== user.username) {
        const usernameExists = await User.findOne({ username });
        if (usernameExists) {
            req.flash("error", "Username already taken");
            return res.redirect("/account");
        }
        user.username = username;
    }

    if (email && email !== user.email) {
        const emailExists = await User.findOne({ email });
        if (emailExists) {
            req.flash("error", "Email already taken");
            return res.redirect("/account");
        }
        user.email = email;
    }

    user.name = name || user.name;
    await user.save();

    req.flash("success", "Profile updated successfully!");
    return res.redirect("/account");
});

/* ------------------- PROFILE PICTURE ------------------- */
const uploadProfilePicture = asyncHandler(async (req, res) => {
    if (!req.file) throw new apiError(400, "No file uploaded");

    const user = await User.findById(req.user._id);
    if (user.profilePictureId) await deleteFromCloudinary(user.profilePictureId);

    user.profilePicture = req.file.path;
    user.profilePictureId = req.file.filename;
    await user.save();

    req.flash("success", "Profile picture updated successfully!");
    return res.redirect("/account");
});

const deleteProfilePicture = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user.profilePictureId) await deleteFromCloudinary(user.profilePictureId);

    user.profilePicture = DEFAULT_AVATAR;
    user.profilePictureId = null;
    await user.save();

    req.flash("success", "Profile picture removed successfully!");
    return res.redirect("/account");
});

/* ------------------- DELETE USER ------------------- */
const deleteUser = asyncHandler(async (req, res) => {
    await User.findByIdAndDelete(req.user._id);
    req.flash("success", "Account deleted successfully!");
    return res.redirect("/login");
});

/* ------------------- PASSWORD RESET ------------------- */
const requestPasswordReset = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).render("pages/forgot-password", { message: "Email is required." });

    const user = await User.findOne({ email });
    const genericMsg = "If the email is valid, a reset link has been sent.";
    if (!user) {
        req.flash("success", genericMsg);
        return res.render("pages/forgot-password", { message: genericMsg });
    }

    const token = crypto.randomBytes(32).toString("hex");
    user.resetToken = token;
    user.resetTokenExpires = Date.now() + 30 * 60 * 1000;
    await user.save();

    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
    const host = req.headers.host;
    const resetLink = `${protocol}://${host}/api/users/reset-password/${token}`;

    const mailOptions = {
        from: `"Support Team" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: "Password Reset",
        html: `<p>You requested a password reset.</p><p>Click <a href="${resetLink}">here</a> to reset your password.</p><p>This link expires in 30 minutes.</p>`,
    };
    await transporter.sendMail(mailOptions);

    req.flash("success", genericMsg);
    return res.render("pages/forgot-password", { message: genericMsg });
});

const renderResetPasswordPage = asyncHandler(async (req, res) => {
    const { token } = req.params;
    const user = await User.findOne({ resetToken: token, resetTokenExpires: { $gt: Date.now() } });
    if (!user) return res.send("Reset link is invalid or expired.");
    res.render("pages/reset-password", { token });
});

const resetPassword = asyncHandler(async (req, res) => {
    const { token, password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
        req.flash("error", "Passwords do not match.");
        return res.redirect(`/api/users/reset-password/${token}`);
    }

    const strength = validatePassword(password);
    if (strength.errors.length > 0) {
        req.flash("error", strength.errors.join(" "));
        return res.redirect(`/api/users/reset-password/${token}`);
    }

    const user = await User.findOne({ resetToken: token, resetTokenExpires: { $gt: Date.now() } });
    if (!user) {
        req.flash("error", "Reset token is invalid or expired.");
        return res.redirect("/forgot-password");
    }

    await user.setPassword(password);
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save();

    req.flash("success", "Password reset successfully. Please log in.");
    return res.redirect("/login");
});

/* ------------------- LAWYER ------------------- */
const updateLawyerProfile = asyncHandler(async (req, res) => {
    const { bio, specialization, licenseNumber, experience, city, state, languagesSpoken, availableSlots, fees } = req.body;
    const user = await User.findById(req.user._id).populate("lawyerProfile");
    if (!user) {
        req.flash("error", "Please login.");
        return res.redirect("/login");
    }
    if (user.role !== "lawyer") {
        req.flash("error", "Only lawyers can update lawyer profiles");
        return res.redirect("/account");
    }

    if (!specialization || !licenseNumber) {
        req.flash("error", "Specialization and license number are required");
        return res.redirect("/account");
    }

    let lawyerProfileDoc;
    if (!user.lawyerProfile) {
        lawyerProfileDoc = new LawyerProfile({
            user: user._id,
            bio,
            specialization,
            licenseNumber,
            experience,
            city,
            state,
            languagesSpoken: languagesSpoken ? languagesSpoken.split(",").map((l) => l.trim()) : [],
            availableSlots: Array.isArray(availableSlots)
                ? availableSlots.filter((slot) => slot && slot.trim() !== "")
                : availableSlots
                ? availableSlots.split(",").map((slot) => slot.trim()).filter((slot) => slot !== "")
                : [],
            fees,
        });
        await lawyerProfileDoc.save();
        user.lawyerProfile = lawyerProfileDoc._id;
        await user.save();
    } else {
        lawyerProfileDoc = user.lawyerProfile;
        lawyerProfileDoc.bio = bio || lawyerProfileDoc.bio;
        lawyerProfileDoc.specialization = specialization || lawyerProfileDoc.specialization;
        lawyerProfileDoc.licenseNumber = licenseNumber || lawyerProfileDoc.licenseNumber;
        lawyerProfileDoc.experience = experience ?? lawyerProfileDoc.experience;
        lawyerProfileDoc.city = city || lawyerProfileDoc.city;
        lawyerProfileDoc.state = state || lawyerProfileDoc.state;
        lawyerProfileDoc.languagesSpoken = languagesSpoken ? languagesSpoken.split(",").map((l) => l.trim()) : lawyerProfileDoc.languagesSpoken || [];
        lawyerProfileDoc.availableSlots = Array.isArray(availableSlots)
            ? availableSlots.filter((slot) => slot && slot.trim() !== "")
            : availableSlots
            ? availableSlots.split(",").map((slot) => slot.trim()).filter((slot) => slot !== "")
            : lawyerProfileDoc.availableSlots;
        lawyerProfileDoc.fees = fees ?? lawyerProfileDoc.fees;
        await lawyerProfileDoc.save();
    }

    req.flash("success", "Lawyer profile updated successfully!");
    return res.redirect("/account");
});

const applyForLawyer = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user?._id);
    if (!user) {
        req.flash("error", "Please login.");
        return res.redirect("/login");
    }
    if (user.role === "lawyer") {
        req.flash("error", "You are already registered as a lawyer");
        return res.redirect("/account");
    }
    if (user.role !== "user") {
        req.flash("error", "Only standard users can apply to become a lawyer");
        return res.redirect("/account");
    }

    const { specialization, licenseNumber } = req.body;
    if (!specialization || !licenseNumber) {
        req.flash("error", "Specialization and license number are required");
        return res.redirect("/account");
    }

    const existingProfile = await LawyerProfile.findOne({ user: user._id });
    if (existingProfile) {
        req.flash("error", "You have already submitted a lawyer application");
        return res.redirect("/account");
    }

    try {
        const lawyerProfile = new LawyerProfile({ user: user._id, specialization, licenseNumber });
        await lawyerProfile.save();
        user.lawyerProfile = lawyerProfile._id;
        user.role = "lawyer";
        await user.save();

        req.flash("success", "Application submitted successfully!");
        return res.redirect("/account");
    } catch (err) {
        req.flash("error", err.message);
        return res.redirect("/account");
    }
});

const renderLawyerApplyForm = asyncHandler(async (req, res) => {
    res.render("users/applyforlawyer");
});

module.exports = {
    registerAccount,
    loginUser,
    logoutUser,
    googleAuth,
    googleCallback,
    getUserProfile,
    renderUpdateForm,
    renderLawyerUpdateForm,
    updateUser,
    uploadProfilePicture,
    deleteProfilePicture,
    deleteUser,
    requestPasswordReset,
    renderResetPasswordPage,
    resetPassword,
    updateLawyerProfile,
    applyForLawyer,
    renderLawyerApplyForm,
};
