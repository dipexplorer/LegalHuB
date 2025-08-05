const User = require("../models/user.model.js");
const asyncHandler = require("../utils/asyncHandler.js");
const apiResponse = require("../utils/apiResponse.js");
const apiError = require("../utils/apiError.js");
const passport = require("passport");
const validatePassword = require("../validators/passwordValidator.js");


// 📌 Register User
const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password, confirmPassword } = req.body;

    if (!username || !email || !password || !confirmPassword) {
        const errorMsg = "All fields are required";
        if (req.accepts("html")) {
            req.flash("error", errorMsg);
            return res.redirect("/login");
        }else{
            throw new apiError(400, errorMsg);
        }
    }

     // Validate password strength
    const result = validatePassword(password);
    if (result.errors.length > 0) {
    return res.status(400).json({ errors: result.errors, strength: result.strength });
  }

    if (password !== confirmPassword) {
        const errorMsg = "Passwords do not match";
        if (req.accepts("html")) {
            req.flash("error", errorMsg);
            return res.redirect("/login");
        }else{
            throw new apiError(400, errorMsg);
        }
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        const errorMsg = "User already exists";
        if (req.accepts("html")) {
            req.flash("error", errorMsg);
            return res.redirect("/login");
        }else{
            throw new apiError(400, errorMsg);
        }
    }

    try {
        const newUser = new User({ username, email });
        const registeredUser = await User.register(newUser, password);
        req.login(newUser, (err) => {
            if (err) {
                const errorMsg = "Login failed after registration";
                if (req.accepts("html")) {
                    req.flash("error", errorMsg);
                    return res.redirect("/login");
                }else{
                    throw new apiError(500, errorMsg);
                }
            }

            if (req.accepts("html")) {
                req.flash("success", "Welcome! Account created successfully.");
                return res.redirect("/");
            }else{
                return res.status(201).json(
                    new apiResponse(201, registeredUser, "User registered successfully")
                );
            }
        });
    } catch (err) {
        if (req.accepts("html")) {
            req.flash("error", err.message);
            return res.redirect("/login");
        }else{
            throw new apiError(500, err.message);
        }
    }
});

// 📌 Login User
const loginUser = asyncHandler(async (req, res, next) => {
    // console.log("login");
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

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    getUserProfile,
    renderUpdateForm,
    updateUser,
    deleteUser,
};
