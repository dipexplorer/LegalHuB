const User = require("../models/user.model.js");
const asyncHandler = require("../utils/asyncHandler.js");
const apiResponse = require("../utils/apiResponse.js");
const apiError = require("../utils/apiError.js");
const passport = require("passport");
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');


// 📌 Nodemailer setup

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,      // Add in your .env
    pass: process.env.EMAIL_PASS
  }
});
// 📌 Register User
const registerUser = asyncHandler(async (req, res, next) => {
    const { username, email, password, confirmPassword } = req.body;

    if (!username || !email || !password || !confirmPassword) {
        const errorMsg = "All fields are required";
        if (req.accepts("json")) {
            throw new apiError(400, errorMsg);
        }
        req.flash("error", errorMsg);
        return res.redirect("/login");
    }

    if (password !== confirmPassword) {
        const errorMsg = "Passwords do not match";
        if (req.accepts("json")) {
            throw new apiError(400, errorMsg);
        }
        req.flash("error", errorMsg);
        return res.redirect("/login");
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        const errorMsg = "User already exists";
        if (req.accepts("json")) {
            throw new apiError(400, errorMsg);
        }
        req.flash("error", errorMsg);
        return res.redirect("/login");
    }

    try {
        const newUser = new User({ username, email });
        const registeredUser = await User.register(newUser, password);
        req.login(newUser, (err) => {
            if (err) {
                const errorMsg = "Login failed after registration";
                if (req.accepts("json")) {
                    throw new apiError(500, errorMsg);
                }
                req.flash("error", errorMsg);
                return res.redirect("/login"); // Return here to prevent further execution
            }

            if (req.accepts("json")) {
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

            req.flash("success", "Welcome! Account created successfully.");
            return res.redirect("/");
        });
    } catch (err) {
        if (req.accepts("json")) {
            throw new apiError(500, err.message);
        }
        req.flash("error", err.message);
        return res.redirect("/login");
    }
});

// 📌 Login User
const loginUser = asyncHandler(async (req, res, next) => {
    
    console.log("login");
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
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
        res.redirect("/login");
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

// 📌 Update User
const updateUser = asyncHandler(async (req, res) => {
    const {
        username,
        name,
        email,
        specialization,
        licenseNumber,
        experience,
        profilePicture,
    } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
        return next(new apiError(404, "User not found"));
    }

    user.username = username || user.username;
    user.name = name || user.name;
    user.email = email || user.email;
    user.specialization = specialization || user.specialization;
    user.licenseNumber = licenseNumber || user.licenseNumber;
    user.experience = experience || user.experience;
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

//Controllers to reset password
const requestPasswordReset = async (req, res) => {
  const { email } = req.body;
    console.log("saving tokens")
const user = await User.findOne({ email });
if (!user) {
  return res.render("pages/forgot-password", { message: "User doesnt exist" });
}


  const token = crypto.randomBytes(32).toString('hex');
  user.resetToken = token;
  user.resetTokenExpires = Date.now() + 30 * 60 * 1000; // 30 min
  await user.save();
    console.log(user.resetToken)
  const resetLink = `http://192.168.100.4:8000/api/users/reset-password/${token}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: 'Password Reset',
    html: `<p>Click <a href="${resetLink}">here</a> to reset your password. This link expires in 30 minutes.</p>`
  };

  try {
    await transporter.sendMail(mailOptions);
  res.render("pages/forgot-password", { message: "If the email is valid, a reset link has been sent." });

  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to send email.");
  }
};

// 🔐 Render Reset Password Page
const renderResetPasswordPage = async (req, res) => {
  const { token } = req.params;

  const user = await User.findOne({
    resetToken: token,
    resetTokenExpires: { $gt: Date.now() }
  });

  if (!user) {
    return res.send("Reset link is invalid or expired.");
  }

  res.render('pages/reset-password', { token });
};

// 🔐 Reset Password Handler
const resetPassword = async (req, res) => {
  const { token, password, confirmPassword } = req.body;
  console.log(password, confirmPassword);
  console.log("Resetting password for token:", token);

  if (password !== confirmPassword) {
    return res.send("Passwords do not match.");
  }

  const user = await User.findOne({
    resetToken: token,
    resetTokenExpires: { $gt: Date.now() }
  });
  console.log("User found:", user);

  if (!user) {
    return res.send("Reset token is invalid or expired.");
  }
  await user.setPassword(password);
  user.resetToken = undefined;
  user.resetTokenExpires = undefined;
  await user.save();

  res.render("users/login");
};

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    getUserProfile,
    renderUpdateForm,
    updateUser,
    deleteUser,
    requestPasswordReset,
    renderResetPasswordPage,
    resetPassword
};
