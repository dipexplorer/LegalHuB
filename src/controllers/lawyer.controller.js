const User = require("../models/user.model.js");
const asyncHandler = require("../utils/asyncHandler");
const apiError = require("../utils/apiError");
const apiResponse = require("../utils/apiResponse");
const LawyerProfile = require("../models/lawyer.model.js");

const getLawyers = asyncHandler(async (req, res) => {
    const lawyers = await User.find({});
    res.status(200).json(
        new apiResponse(200, lawyers, "Lawyers fetched successfully")
    );
});

const viewLawyer = asyncHandler(async (req, res) => {
    const lawyer = await User.findById(req.params.id).populate({
        path: "lawyerProfile",
        model: LawyerProfile,
        select: "bio specialization licenseNumber experience city state languagesSpoken availableSlots fees ",
    });
    console.log(lawyer);

    if (!lawyer) {
        return res.status(404).send("Lawyer not found");
    }
    // res.render('pages/lawyer-profile', { lawyer });
    if (req.accepts("html")) {
        return res.render("pages/lawyer-profile", { lawyer });
    } else {
        return res.status(200).json(new apiResponse(200,lawyer,"Lawyer profile fetched successfully"));
    }
});

module.exports = {
    getLawyers,
    viewLawyer,
};
