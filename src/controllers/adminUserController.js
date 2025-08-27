const User = require("../models/user.model.js");
const asyncHandler = require("../utils/asyncHandler.js");
const apiResponse = require("../utils/apiResponse.js");
const apiError = require("../utils/apiError.js");


// Render pages
const renderUserPage = asyncHandler(async (req, res) => {
    const users = await User.find({ role: "user" }).sort({ createdAt: -1 });
    if (req.accepts("html")) {
        return res.render("admin/usersPage", { users });
    }

    res.status(200).json(new apiResponse(200, users, "Users fetched successfully"));
});

// Toggle active/inactive
const toggleUserStatus = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw new apiError(404, "User not found");

    user.isActive = !user.isActive;
    await user.save();

    if (req.accepts("html")) {
        req.flash("success", "User status updated successfully");
        return res.redirect("/api/admin/dashboard/users");
    }

    res.status(200).json(new apiResponse(200, user, "User status updated successfully"));

});

// Change role (user/lawyer/admin)
const changeUserRole = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new apiError(404, "User not found");

  const { role } = req.body;
  if (!["user", "lawyer"].includes(role)) {
    throw new apiError(400, "Invalid role");
  }

  user.role = role;
  await user.save();

  if (req.accepts("html")) {
    req.flash("success", "User role updated successfully");
    res.redirect("/api/admin/dashboard/users");
  }
  res.status(200).json(new apiResponse(200, user, "User role updated successfully"));
});

// Delete user
const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new apiError(404, "User not found");

  await user.deleteOne();

  if(req.accepts("html")) {
    req.flash("success", "User deleted successfully");
    res.redirect("/api/admin/dashboard/users");
  }
  res.status(200).json(new apiResponse(200, user, "User deleted successfully"));
});

module.exports = {
    renderUserPage,
    toggleUserStatus,
    changeUserRole,
}