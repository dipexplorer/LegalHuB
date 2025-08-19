const User = require("../models/user.model.js");
const asyncHandler = require("../utils/asyncHandler");
const apiError = require("../utils/apiError");
const apiResponse = require("../utils/apiResponse");
const LawyerProfile = require("../models/lawyer.model.js");

const getLawyers = asyncHandler(async (req, res) => {
    const lawyers = await User.find({ role: "lawyer" }).populate({
        path: "lawyerProfile",
        model: LawyerProfile,
        select: "specialization experience city state availableSlots fees isVerified",
    });

    if (req.accepts("html")) {
        return res.render("pages/lawyers", { lawyers });
    } else {
        return res.status(200).json(new apiResponse(200, lawyers, "Lawyers fetched successfully"));
    }
});

const viewLawyer = asyncHandler(async (req, res) => {
    const lawyer = await User.findById(req.params.id).populate({
        path: "lawyerProfile",
        model: LawyerProfile,
        // ✅ Include reviews field in select
        select: "bio specialization licenseNumber experience city state languagesSpoken availableSlots fees isVerified reviews",
        populate: {
            path: "reviews",
            model: "Review",
            select: "rating comment author",
            populate: {
                path: "author",
                model: "User",
                select: "username profilePicture",
            },
        },
    });
    if (!lawyer) {
        return res.status(404).send("Lawyer not found");
    }

    let userHasReviewed = false;
    if (req.user && lawyer.lawyerProfile && lawyer.lawyerProfile.reviews) {
        userHasReviewed = lawyer.lawyerProfile.reviews.some(
            (review) => review.author && review.author._id && review.author._id.equals(req.user._id)
        );
    }

    if (req.accepts("html")) {
        return res.render("pages/lawyer-profile", { lawyer, userHasReviewed });
    } else {
        return res
            .status(200)
            .json(new apiResponse(200, lawyer, "Lawyer profile fetched successfully"));
    }
});

module.exports = {
    getLawyers,
    viewLawyer,
};
