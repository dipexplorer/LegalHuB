const User = require("../models/user.model.js");
const LawyerProfile = require("../models/lawyer.model.js");
const lawyerModel = require("../models/lawyer.model.js");
const Right = require("../models/rights.model.js");
const Document = require("../models/document.model.js");
const Article = require("../models/article.model.js");
const asyncHandler = require("../utils/asyncHandler.js");
const apiResponse = require("../utils/apiResponse.js");
const apiError = require("../utils/apiError.js");

// Admin approves lawyer application
exports.adminApproveLawyer = asyncHandler(async (req, res) => {
    const lawyer = await LawyerProfile.findById(req.params.id);
    if (!lawyer) {
        return res.status(404).json(new apiError(404, "Lawyer not found"));
    }
    lawyer.isApproved = true;
    await lawyer.save();
    res.status(200).json(
        new apiResponse(200, lawyer, "Lawyer approved successfully")
    );
})