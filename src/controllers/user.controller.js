const User = require("../models/user.model.js");
const LawyerProfile = require("../models/lawyer.model.js");
const asyncHandler = require("../utils/asyncHandler.js");
const apiResponse = require("../utils/apiResponse.js");
const apiError = require("../utils/apiError.js");
const passport = require("passport");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const validatePassword = require("../validators/passwordValidator.js");

// Cloudinary helpers
const { cloudinary, storage } = require("../config/cloudinary.js"); // storage is there if needed by your multer
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

// Register Account
const registerAccount = asyncHandler(async (req, res) => {
const { username, email, password, confirmPassword, role, lawyerProfile } = req.body;

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

// Required fields check
if (!username || !email || !password || !confirmPassword) {
const errorMsg = "All fields are required";
if (req.accepts("html")) {
req.flash("error", errorMsg);
return res.redirect("/login");
}
throw new apiError(400, errorMsg);
}

// Password strength check
const strength = validatePassword(password);
if (strength.errors.length > 0) {
if (req.accepts("html")) {
req.flash("error", strength.errors.join(", "));
return res.redirect("/register");
}
return res.status(400).json({ errors: strength.errors, strength: strength.strength });
}

// Password match check
if (password !== confirmPassword) {
const errorMsg = "Passwords do not match";
if (req.accepts("html")) {
req.flash("error", errorMsg);
return res.redirect("/login");
}
throw new apiError(400, errorMsg);
}

// Unique username/email
const existing = await User.findOne({ $or: [{ email }, { username }] });
if (existing) {
const msg = "User with given email or username already exists";
if (req.accepts("html")) {
req.flash("error", msg);
return res.redirect("/login");
}
throw new apiError(400, msg);
}

// Create user
try {
const newUser = new User({ username, email, role: role || "user" });
// Uses passport-local-mongoose's register helper with hashing
const registeredUser = await User.register(newUser, password);

// If role is lawyer, create LawyerProfile
if (registeredUser.role === "lawyer") {
  if (!lawyerProfile?.specialization || !lawyerProfile?.licenseNumber) {
    const msg = "Specialization and license number are required for lawyer registration";
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

// Login user after registration
req.login(registeredUser, (err) => {
  if (err) {
    const errorMsg = "Login failed after registration";
    if (req.accepts("html")) {
      req.flash("error", errorMsg);
      return res.redirect("/login");
    }
    throw new apiError(500, errorMsg);
  }
  if (req.accepts("html")) {
    req.flash("success", "Welcome! Account created successfully.");
    return res.redirect("/");
  }
  return res
    .status(201)
    .json(new apiResponse(201, registeredUser, "User registered successfully"));
});
} catch (err) {
if (req.accepts("html")) {
req.flash("error", err.message);
return res.redirect("/login");
}
throw new apiError(500, err.message);
}
});

// Login User
const loginUser = asyncHandler(async (req, res) => {
req.flash("success", "Logged in successfully!");
return res.redirect("/");
});

// Logout User
const logoutUser = asyncHandler(async (req, res, next) => {
if (!req.session) {
return next(new apiError(500, "Session not found"));
}
req.logout((err) => {
if (err) return next(new apiError(500, "Logout failed"));
req.flash("success", "Logged out successfully!");
res.clearCookie("connect.sid"); // optional: removes cookie but leaves store entry
return res.redirect("/");
});
});

// Get User Profile
const getUserProfile = asyncHandler(async (req, res) => {
if (!req.user) {
return res.redirect("/login");
}
const user = await User.findById(req.user._id).select("-password").populate("lawyerProfile");
if (!user) {
return res.redirect("/login");
}
if (req.accepts("html")) {
return res.render("users/profile", { user });
}
return res.status(200).json(new apiResponse(200, user, "User profile fetched successfully"));
});

// Render update form
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

// Render lawyer update form
const renderLawyerUpdateForm = asyncHandler(async (req, res) => {
if (!req.user) {
return res.redirect("/login");
}
const user = await User.findById(req.user._id).select("-password").populate("lawyerProfile");
if (!user || user.role !== "lawyer") {
req.flash("error", "You must be logged in as a lawyer to access this page");
return res.redirect("/login");
}
res.render("users/updateLawyer", {
user,
lawyerProfile: user.lawyerProfile,
});
});

// Update User (basic fields only; image upload handled in separate handler below)
const updateUser = asyncHandler(async (req, res) => {
const { username, name, email } = req.body;
const user = await User.findById(req.user._id);
if (!user) {
if (req.accepts("html")) {
req.flash("error", "Please login.");
return res.redirect("/login");
}
throw new apiError(404, "User not found");
}

// Unique username
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

// Unique email
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

user.name = name || user.name; // Name is optional

await user.save();

if (req.accepts("html")) {
req.flash("success", "Profile updated successfully!");
return res.redirect("/account");
}
return res.status(200).json(new apiResponse(200, user, "User profile updated successfully"));
});

// Upload or replace profile picture (Cloudinary via multer)
const uploadProfilePicture = asyncHandler(async (req, res) => {
if (!req.file) throw new apiError(400, "No file uploaded");

const user = await User.findById(req.user._id);

// If your schema stores previous publicId
if (user.profilePictureId) {
await deleteFromCloudinary(user.profilePictureId).catch(() => {});
}

// Save new (req.file.path is Cloudinary secure URL, filename is public_id for multer-storage-cloudinary)
user.profilePicture = req.file.path;
user.profilePictureId = req.file.filename;

await user.save();

if (req.accepts("html")) {
req.flash("success", "Profile picture updated successfully!");
return res.redirect("/account");
}
return res.status(200).json(new apiResponse(200, user, "Profile picture updated"));
});

// Delete profile picture (reset to default)
const deleteProfilePicture = asyncHandler(async (req, res) => {
const user = await User.findById(req.user._id);

if (user.profilePictureId) {
await deleteFromCloudinary(user.profilePictureId).catch(() => {});
}

user.profilePicture = DEFAULT_AVATAR;
user.profilePictureId = null;

await user.save();

if (req.accepts("html")) {
req.flash("success", "Profile picture removed successfully!");
return res.redirect("/account");
}
return res.status(200).json(new apiResponse(200, user, "Profile picture removed"));
});

// Delete User
const deleteUser = asyncHandler(async (req, res) => {
await User.findByIdAndDelete(req.user._id);
if (req.accepts("html")) {
req.flash("success", "Account deleted successfully!");
return res.redirect("/login");
}
return res.status(200).json(new apiResponse(200, null, "User deleted successfully"));
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

// Generic message to prevent enumeration
const genericMsg = "If the email is valid, a reset link has been sent.";
if (!user) {
req.flash("success", genericMsg);
return res.render("pages/forgot-password", { message: genericMsg });
}

// Generate reset token and expiry
const token = crypto.randomBytes(32).toString("hex");
user.resetToken = token;
user.resetTokenExpires = Date.now() + 30 * 60 * 1000; // 30 mins
await user.save();

// Dynamic domain
const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
const host = req.headers.host;
const resetLink = ${protocol}://${host}/api/users/reset-password/${token};

const mailOptions = {
from: "Support Team" <${process.env.EMAIL_USER}>,
to: user.email,
subject: "Password Reset",
html: <p>You requested a password reset.</p> <p>Click <a href="${resetLink}">here</a> to reset your password.</p> <p>This link expires in 30 minutes.</p> ,
};

await transporter.sendMail(mailOptions);

req.flash("success", genericMsg);
return res.render("pages/forgot-password", { message: genericMsg });
});

// Render reset password page
const renderResetPasswordPage = asyncHandler(async (req, res) => {
const { token } = req.params;
const user = await User.findOne({
resetToken: token,
resetTokenExpires: { $gt: Date.now() },
});
if (!user) {
return res.send("Reset link is invalid or expired.");
}
res.render("pages/reset-password", { token });
});

// Reset password
const resetPassword = asyncHandler(async (req, res) => {
const { token, password, confirmPassword } = req.body;

if (password !== confirmPassword) {
req.flash("error", "Passwords do not match.");
return res.redirect(/api/users/reset-password/${token});
}

const strength = validatePassword(password);
if (strength.errors.length > 0) {
req.flash("error", strength.errors.join(" "));
return res.redirect(/api/users/reset-password/${token});
}

const user = await User.findOne({
resetToken: token,
resetTokenExpires: { $gt: Date.now() },
});
if (!user) {
req.flash("error", "Reset token is invalid or expired.");
return res.redirect("/forgot-password");
}

// passport-local-mongoose helper
await user.setPassword(password);
user.resetToken = undefined;
user.resetTokenExpires = undefined;
await user.save();

req.flash("success", "Password reset successfully. Please log in.");
return res.redirect("/login");
});

// Update lawyer profile
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

// Required fields for lawyer
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
languagesSpoken: languagesSpoken ? languagesSpoken.split(",").map((l) => l.trim()) : [],
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
lawyerProfileDoc.specialization = specialization || lawyerProfileDoc.specialization;
lawyerProfileDoc.licenseNumber = licenseNumber || lawyerProfileDoc.licenseNumber;
lawyerProfileDoc.experience = experience ?? lawyerProfileDoc.experience;
lawyerProfileDoc.city = city || lawyerProfileDoc.city;
lawyerProfileDoc.state = state || lawyerProfileDoc.state;
lawyerProfileDoc.languagesSpoken = languagesSpoken
? languagesSpoken.split(",").map((l) => l.trim())
: lawyerProfileDoc.languagesSpoken || [];

if (Array.isArray(availableSlots)) {
  lawyerProfileDoc.availableSlots = availableSlots.filter(
    (slot) => slot && slot.trim() !== ""
  );
} else if (availableSlots) {
  lawyerProfileDoc.availableSlots = availableSlots
    .split(",")
    .map((slot) => slot.trim())
    .filter((slot) => slot !== "");
}

lawyerProfileDoc.fees = fees ?? lawyerProfileDoc.fees;
await lawyerProfileDoc.save();
}

if (req.accepts("html")) {
req.flash("success", "Lawyer profile updated successfully!");
return res.redirect("/account");
}
return res
.status(200)
.json(new apiResponse(200, lawyerProfileDoc, "Lawyer profile updated successfully"));
});

// Apply for lawyer
const applyForLawyer = asyncHandler(async (req, res) => {
const user = await User.findById(req.user?._id);
if (!user) {
const msg = "Please login.";
if (req.accepts("html")) {
req.flash("error", msg);
return res.redirect("/login");
}
throw new apiError(404, msg);
}
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

const { specialization, licenseNumber } = req.body;
if (!specialization || !licenseNumber) {
const msg = "Specialization and license number are required";
if (req.accepts("html")) {
req.flash("error", msg);
return res.redirect("/account");
}
throw new apiError(400, msg);
}

const existingProfile = await LawyerProfile.findOne({ user: user._id });
if (existingProfile) {
const msg = "You have already submitted a lawyer application";
if (req.accepts("html")) {
req.flash("error", msg);
return res.redirect("/account");
}
throw new apiError(400, msg);
}

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
  .json(new apiResponse(200, lawyerProfile, "Application submitted successfully"));
} catch (err) {
if (req.accepts("html")) {
req.flash("error", err.message);
return res.redirect("/account");
}
throw new apiError(500, err.message);
}
});

// Render apply form
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