const User = require("../models/user.model.js");
const LawyerProfile = require("../models/lawyer.model.js");
const asyncHandler = require("../utils/asyncHandler.js");
const apiResponse = require("../utils/apiResponse.js");
const apiError = require("../utils/apiError.js");

// Get all lawyers
const getAllLawyers = asyncHandler(async (req, res) => {
  const lawyers = await LawyerProfile.find()
    .populate("user", "name email profilePicture")
    .sort({ createdAt: -1 });

  if (req.accepts("html")) {
    return res.render("admin/lawyers", { lawyers });
  }

  res.status(200).json(lawyers);
});

// Toggle active/inactive
const toggleLawyerStatus = asyncHandler(async (req, res) => {
  const lawyer = await LawyerProfile.findById(req.params.id);
  if (!lawyer) throw new apiError(404, "Lawyer not found");

  lawyer.isActive = !lawyer.isActive;
  await lawyer.save();

  if(req.accepts("html")){
    req.flash("success", "Lawyer status updated successfully");
    return res.redirect("/api/admin/dashboard/lawyers");
  }
  res.status(200).json(new apiResponse(200, lawyer, "Lawyer status updated successfully"));
});


// Delete lawyer
const deleteLawyer = asyncHandler(async (req, res) => {
  const lawyer = await LawyerProfile.findById(req.params.id);
  if (!lawyer) throw new apiError(404, "Lawyer not found");

  await lawyer.deleteOne();
  if(req.accepts("html")){
    req.flash("success", "Lawyer deleted successfully");
    return res.redirect("/api/admin/dashboard/lawyers");
  }
  res.status(200).json(new apiResponse(200, lawyer, "Lawyer deleted successfully"));
});


module.exports = {
  getAllLawyers,
  toggleLawyerStatus,
  deleteLawyer,
}