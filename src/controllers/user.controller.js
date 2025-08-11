const User = require("../models/user.model.js");
const LawyerProfile = require("../models/lawyer.model.js");
const asyncHandler = require("../utils/asyncHandler.js");
const apiResponse = require("../utils/apiResponse.js");
const apiError = require("../utils/apiError.js");
const passport = require("passport");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const validatePassword = require("../validators/passwordValidator.js");
const lawyerModel = require("../models/lawyer.model.js");

// 📌 Nodemailer setup
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER, // Add in your .env
        pass: process.env.EMAIL_PASS,
    },
});

// 📌 Register User
const registerAccount = asyncHandler(async (req, res) => {
    const { username, email, password, confirmPassword, role, lawyerProfile } =
        req.body;

    // Validate role from backend whitelist
    const allowedRoles = ["user", "lawyer"];
    if (!allowedRoles.includes(role)) {
        const errorMsg = "Invalid role";
        if (req.accepts("html")) {
            req.flash("error", errorMsg);
            return res.redirect("/login");
        }
        throw new apiError(400, errorMsg);
    }

    // 1️⃣ Required fields check
    if (!username || !email || !password || !confirmPassword) {
        const errorMsg = "All fields are required";
        if (req.accepts("html")) {
            req.flash("error", errorMsg);
            return res.redirect("/login");
        } else {
            throw new apiError(400, errorMsg);
        }
    }

    // 2️⃣ password strength check
    const result = validatePassword(password);
    if (result.errors.length) {
        if (req.accepts("html")) {
            req.flash("error", result.errors.join(", "));
            return res.redirect("/register");
        }
        return res
            .status(400)
            .json({ errors: result.errors, strength: result.strength });
    }

    // 3️⃣ Password match check
    if (password !== confirmPassword) {
        const errorMsg = "Passwords do not match";
        if (req.accepts("html")) {
            req.flash("error", errorMsg);
            return res.redirect("/login");
        }
        throw new apiError(400, errorMsg);
    }

    // 4️⃣ Unique username/email check
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
        const msg = "User with given email or username already exists";
        if (req.accepts("html")) {
            req.flash("error", msg);
            return res.redirect("/login");
        }
        throw new apiError(400, msg);
    }

    // 5️⃣ Create user
    try {
        const newUser = new User({ username, email, role: role || "user" });
        const registeredUser = await User.register(newUser, password);

        // 6️⃣ If role is lawyer, create LawyerProfile
        if (registeredUser.role === "lawyer") {
            if (
                !lawyerProfile ||
                !lawyerProfile.specialization ||
                !lawyerProfile.licenseNumber
            ) {
                const msg =
                    "Specialization and license number are required for lawyer registration";
                if (req.accepts("html")) {
                    req.flash("error", msg);
                    return res.redirect("/login");
                }
                throw new apiError(400, msg);
            }

            const newLawyerProfile = new LawyerProfile({
                user: registeredUser._id,
                ...lawyerProfile,
            });

            await newLawyerProfile.save();
            registeredUser.lawyerProfile = newLawyerProfile._id;
            await registeredUser.save();
        }

        // 7️⃣ Login user after registration
        req.login(registeredUser, (err) => {
            if (err) {
                const errorMsg = "Login failed after registration";
                if (req.accepts("html")) {
                    req.flash("error", errorMsg);
                    return res.redirect("/login");
                } else {
                    throw new apiError(500, errorMsg);
                }
            }

            if (req.accepts("html")) {
                req.flash("success", "Welcome! Account created successfully.");
                return res.redirect("/");
            } else {
                return res
                    .status(201)
                    .json(
                        new apiResponse(
                            201,
                            registeredUser,
                            "User registered successfully"
                        )
                    );
            }
        });
    } catch (err) {
        if (req.accepts("html")) {
            req.flash("error", err.message);
            return res.redirect("/login");
        } else {
            throw new apiError(500, err.message);
        }
    }
});

// 📌 Login User
const loginUser = asyncHandler(async (req, res, next) => {
    req.flash("success", "Logged in successfully!");
    return res.redirect("/"); // ✅ Redirect after login
});

// 📌 Logout User
const logoutUser = asyncHandler(async (req, res, next) => {
    if (!req.session) {
        return next(new apiError(500, "Session not found"));
    }

    // ✅ Pehle flash message store karo
    req.flash("success", "Logged out successfully");

    req.logout((err) => {
        if (err) return next(new apiError(500, "Logout failed"));

        req.session.destroy((err) => {
            if (err)
                return next(new apiError(500, "Session destruction failed"));

            res.clearCookie("connect.sid"); // ✅ Session cookie clear karo
            return res.redirect("/"); // ✅ Redirect karo flash message ke saath
        });
    });
});

// 📌 Get User Profile
const getUserProfile = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.redirect("/login");
    }
    const user = await User.findById(req.user._id).select("-password").populate(
        "lawyerProfile"
    );
    if (!user) {
        return res.redirect("/login");
    }

    if (req.accepts("html")) {
        return res.render("users/profile", { user });
    } else {
        return res
            .status(200)
            .json(
                new apiResponse(200, user, "User profile fetched successfully")
            );
    }
});

// 📌 render updateform
const renderUpdateForm = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.redirect("/login");
    }
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
        return res.redirect("/login");
    }
    res.render("users/updateUser", { user });
});

// 📌 render lawyer update form
const renderLawyerUpdateForm = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.redirect("/login");
    }
    const user = await User.findById(req.user._id)
        .select("-password")
        .populate("lawyerProfile");
    if (!user || user.role !== "lawyer") {
        req.flash(
            "error",
            "You must be logged in as a lawyer to access this page"
        );
        return res.redirect("/login");
    }
    res.render("users/updateLawyer", {
        user,
        lawyerProfile: user.lawyerProfile,
    });
});

// 📌 Update User
const updateUser = asyncHandler(async (req, res) => {
    const { username, name, email, profilePicture } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
        if (req.accepts("html")) {
            req.flash("error", "Please login.");
            return res.redirect("/login");
        }
        throw new apiError(404, "User not found");
    }

    // ✅ Unique username check
    if (username && username !== user.username) {
        const usernameExists = await User.findOne({ username });
        if (usernameExists) {
            const msg = "Username already taken";
            if (req.accepts("html")) {
                req.flash("error", msg);
                return res.redirect("/account");
            }
            throw new apiError(400, msg);
        }
        user.username = username;
    }

    // ✅ Unique email check
    if (email && email !== user.email) {
        const emailExists = await User.findOne({ email });
        if (emailExists) {
            const msg = "Email already taken";
            if (req.accepts("html")) {
                req.flash("error", msg);
                return res.redirect("/account");
            }
            throw new apiError(400, msg);
        }
        user.email = email;
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.profilePicture = profilePicture || user.profilePicture;
    await user.save();

    if (req.accepts("html")) {
        req.flash("success", "Profile updated successfully!");
        return res.redirect("/account");
    } else {
        return res
            .status(200)
            .json(
                new apiResponse(200, user, "User profile updated successfully")
            );
    }
});

// 📌 Delete User
const deleteUser = asyncHandler(async (req, res) => {
    await User.findByIdAndDelete(req.user._id);
    if (req.accepts("html")) {
        req.flash("success", "Account deleted successfully!");
        return res.redirect("/login");
    } else {
        return res
            .status(200)
            .json(new apiResponse(200, null, "User deleted successfully"));
    }
});

// Request password reset
const requestPasswordReset = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).render("pages/forgot-password", {
            message: "Email is required.",
        });
    }

    const user = await User.findOne({ email });

    // Always return generic message to prevent email enumeration
    const genericMsg = "If the email is valid, a reset link has been sent.";

    if (!user) {
        return res.render("pages/forgot-password", { message: genericMsg });
    }

    // Generate reset token and expiry
    const token = crypto.randomBytes(32).toString("hex");
    user.resetToken = token;
    user.resetTokenExpires = Date.now() + 30 * 60 * 1000; // 30 mins
    await user.save();

    // Use req.headers.host or env for dynamic domain
    const resetLink = `http://${req.headers.host}/api/users/reset-password/${token}`;

    const mailOptions = {
        from: `"Support Team" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: "Password Reset",
        html: `
      <p>You requested a password reset.</p>
      <p>Click <a href="${resetLink}">here</a> to reset your password.</p>
      <p>This link expires in 30 minutes.</p>
    `,
    };

    await transporter.sendMail(mailOptions);

    req.flash("success", "Password reset link sent to your email.");
    return res.render("pages/forgot-password", { message: genericMsg });
});

// 🔐 Render Reset Password Page
const renderResetPasswordPage = async (req, res) => {
    const { token } = req.params;

    const user = await User.findOne({
        resetToken: token,
        resetTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
        return res.send("Reset link is invalid or expired.");
    }

    res.render("pages/reset-password", { token });
};

// 🔐 Reset Password Handler
const resetPassword = asyncHandler(async (req, res) => {
    const { token, password, confirmPassword } = req.body;

    // Check if passwords match
    if (password !== confirmPassword) {
        req.flash("error", "Passwords do not match.");
        return res.redirect(`/api/users/reset-password/${token}`);
    }

    // Validate password strength
    const result = validatePassword(password);
    if (result.errors.length > 0) {
        req.flash("error", result.errors.join(" "));
        return res.redirect(`/api/users/reset-password/${token}`);
    }

    // Find user with token
    const user = await User.findOne({
        resetToken: token,
        resetTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
        req.flash("error", "Reset token is invalid or expired.");
        return res.redirect("/forgot-password");
    }

    // Update password
    await user.setPassword(password);
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save();

    req.flash("success", "Password reset successfully. Please log in.");
    return res.redirect("/login");
});

// update lawyer profile
const updateLawyerProfile = asyncHandler(async (req, res) => {
    const {
        bio,
        specialization,
        licenseNumber,
        experience,
        city,
        state,
        languagesSpoken,
        availableSlots,
        fees,
    } = req.body;

    const user = await User.findById(req.user._id).populate("lawyerProfile");

    // ✅ Ensure logged in and a lawyer
    if (!user) {
        if (req.accepts("html")) {
            req.flash("error", "Please login.");
            return res.redirect("/login");
        }
        throw new apiError(404, "User not found");
    }

    if (user.role !== "lawyer") {
        const msg = "Only lawyers can update lawyer profiles";
        if (req.accepts("html")) {
            req.flash("error", msg);
            return res.redirect("/account");
        }
        throw new apiError(403, msg);
    }

    // ✅ Required fields for lawyer
    if (!specialization || !licenseNumber) {
        const msg = "Specialization and license number are required";
        if (req.accepts("html")) {
            req.flash("error", msg);
            return res.redirect("/account");
        }
        throw new apiError(400, msg);
    }

    let lawyerProfileDoc;
    if (!user.lawyerProfile) {
        // Create new profile
        lawyerProfileDoc = new LawyerProfile({
            user: user._id,
            bio,
            specialization,
            licenseNumber,
            experience,
            city,
            state,
            languagesSpoken: languagesSpoken
                ? languagesSpoken.split(",").map((l) => l.trim())
                : [],
            // Handle available slots as array for new profiles too
            availableSlots: Array.isArray(availableSlots)
                ? availableSlots.filter((slot) => slot && slot.trim() !== "")
                : availableSlots
                  ? availableSlots
                        .split(",")
                        .map((slot) => slot.trim())
                        .filter((slot) => slot !== "")
                  : [],
            fees,
        });
        await lawyerProfileDoc.save();
        user.lawyerProfile = lawyerProfileDoc._id;
        await user.save();
    } else {
        // Update existing profile
        lawyerProfileDoc = user.lawyerProfile;
        lawyerProfileDoc.bio = bio || lawyerProfileDoc.bio;
        lawyerProfileDoc.specialization =
            specialization || lawyerProfileDoc.specialization;
        lawyerProfileDoc.licenseNumber =
            licenseNumber || lawyerProfileDoc.licenseNumber;
        lawyerProfileDoc.experience = experience ?? lawyerProfileDoc.experience;
        lawyerProfileDoc.city = city || lawyerProfileDoc.city;
        lawyerProfileDoc.state = state || lawyerProfileDoc.state;
        lawyerProfileDoc.languagesSpoken = languagesSpoken
            ? languagesSpoken.split(",").map((l) => l.trim())
            : [];
        // Handle available slots as array
        if (Array.isArray(availableSlots)) {
            // Filter out empty slots
            lawyerProfileDoc.availableSlots = availableSlots.filter(
                (slot) => slot && slot.trim() !== ""
            );
        } else if (availableSlots) {
            // If it's a string, split by comma (fallback for backward compatibility)
            lawyerProfileDoc.availableSlots = availableSlots
                .split(",")
                .map((slot) => slot.trim())
                .filter((slot) => slot !== "");
        } else {
            lawyerProfileDoc.availableSlots = [];
        }
        lawyerProfileDoc.fees = fees ?? lawyerProfileDoc.fees;
        await lawyerProfileDoc.save();
    }

    if (req.accepts("html")) {
        req.flash("success", "Lawyer profile updated successfully!");
        return res.redirect("/account");
    } else {
        return res
            .status(200)
            .json(
                new apiResponse(
                    200,
                    lawyerProfileDoc,
                    "Lawyer profile updated successfully"
                )
            );
    }
});

// apply for lawyer
const applyForLawyer = asyncHandler(async (req, res) => {
    // 1️⃣ Ensure user is logged in
    const user = await User.findById(req.user?._id);
    if (!user) {
        const msg = "Please login.";
        if (req.accepts("html")) {
            req.flash("error", msg);
            return res.redirect("/login");
        }
        throw new apiError(404, msg);
    }

    // 2️⃣ Only allow "user" role to apply
    if (user.role === "lawyer") {
        const msg = "You are already registered as a lawyer";
        if (req.accepts("html")) {
            req.flash("error", msg);
            return res.redirect("/account");
        }
        throw new apiError(403, msg);
    }

    if (user.role !== "user") {
        const msg = "Only standard users can apply to become a lawyer";
        if (req.accepts("html")) {
            req.flash("error", msg);
            return res.redirect("/account");
        }
        throw new apiError(403, msg);
    }

    // 3️⃣ Validate required lawyer details
    const { specialization, licenseNumber } = req.body;
    if (!specialization || !licenseNumber) {
        const msg = "Specialization and license number are required";
        if (req.accepts("html")) {
            req.flash("error", msg);
            return res.redirect("/account");
        }
        throw new apiError(400, msg);
    }

    // 4️⃣ Prevent duplicate lawyer applications
    const existingProfile = await LawyerProfile.findOne({ user: user._id });
    if (existingProfile) {
        const msg = "You have already submitted a lawyer application";
        if (req.accepts("html")) {
            req.flash("error", msg);
            return res.redirect("/account");
        }
        throw new apiError(400, msg);
    }

    // 5️⃣ Create lawyer profile & update role
    try {
        const lawyerProfile = new LawyerProfile({
            user: user._id,
            specialization,
            licenseNumber,
        });

        await lawyerProfile.save();
        user.lawyerProfile = lawyerProfile._id;
        user.role = "lawyer";
        await user.save();

        if (req.accepts("html")) {
            req.flash("success", "Application submitted successfully!");
            return res.redirect("/account");
        }
        return res
            .status(200)
            .json(
                new apiResponse(
                    200,
                    lawyerProfile,
                    "Application submitted successfully"
                )
            );
    } catch (err) {
        if (req.accepts("html")) {
            req.flash("error", err.message);
            return res.redirect("/account");
        }
        throw new apiError(500, err.message);
    }
});

// render apply form
const renderLawyerApplyForm = asyncHandler(async (req, res) => {
    res.render("users/applyforlawyer");
});

module.exports = {
    registerAccount,
    loginUser,
    logoutUser,
    getUserProfile,
    renderUpdateForm,
    renderLawyerUpdateForm,
    updateUser,
    deleteUser,
    requestPasswordReset,
    renderResetPasswordPage,
    resetPassword,
    updateLawyerProfile,
    applyForLawyer,
    renderLawyerApplyForm,
};
