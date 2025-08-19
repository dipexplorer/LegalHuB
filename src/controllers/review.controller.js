const Review = require("../models/review.model.js");
const LawyerProfile = require("../models/lawyer.model.js");
const User = require("../models/user.model.js");
const asyncHandler = require("../utils/asyncHandler.js");
const apiError = require("../utils/apiError.js");
const apiResponse = require("../utils/apiResponse.js");

const createReview = asyncHandler(async (req, res) => {
    const { lawyerId } = req.params;
    const { rating, comment } = req.body.review;
    const authorId = req.user._id;

    // Validate inputs
    if (!rating || !comment) {
        req.flash("error", "Rating and comment are required");
        return res.redirect(`/lawyers/${lawyerId}`);
    }

    // Prevent reviewing self
    if (authorId.toString() === lawyerId.toString()) {
        req.flash("error", "You cannot review yourself");
        return res.redirect(`/lawyers/${lawyerId}`);
    }

    // Check if the lawyer exists
    const lawyer = await User.findById(lawyerId).populate("lawyerProfile");
    if (!lawyer) {
        req.flash("error", "Lawyer not found");
        return res.redirect(`/lawyers/${lawyerId}`);
    }

    // Check if the user has already reviewed this lawyer
    const existingReview = await Review.findOne({ lawyer: lawyerId, author: authorId });
    if (existingReview) {
        req.flash("error", "You have already reviewed this lawyer");
        return res.redirect(`/lawyers/${lawyerId}`);
    }

    // Set the limit of 500 charecter maximum for comment
    if (comment.length > 500) {
        req.flash("error", "Maximum 500 characters are allowed for review!");
        return res.redirect(`/lawyers/${lawyerId}`);
    }

    // Create the review
    const review = await Review.create({
        lawyer: lawyerId,
        author: authorId,
        rating,
        comment,
    });

    // Add the review to the lawyer's profile
    lawyer.lawyerProfile.reviews.push(review._id);
    await lawyer.lawyerProfile.save();

    if (req.accepts("html")) {
        req.flash("success", "Review added successfully!");
        return res.redirect(`/lawyers/${lawyerId}`);
    }
    return res.status(201).json(new apiResponse(201, review, "Review added successfully"));
});

//delete a review
const deleteReview = asyncHandler(async (req, res) => {
    const { lawyerId, reviewId } = req.params;

    // Check if the review exists
    const review = await Review.findById(reviewId);
    if (!review) {
        req.flash("error", "Review not found");
        return res.redirect(`/lawyers/${lawyerId}`);
    }

    // Check if the user is the author of the review
    if (review.author.toString() !== req.user._id.toString() && req.user.role !== "admin") {
        req.flash("error", "You are not authorized to delete this review");
        return res.redirect(`/lawyers/${lawyerId}`);
    }

    // Delete the review
    await Review.findByIdAndDelete(reviewId);

    // Remove the review from the lawyer's profile
    const lawyer = await User.findByIdAndUpdate(lawyerId, {
        $pull: { reviews: reviewId },
    });
    if (!lawyer) {
        req.flash("error", "Lawyer not found");
        return res.redirect(`/lawyers/${lawyerId}`);
    }

    if (req.accepts("html")) {
        req.flash("success", "Review deleted successfully!");
        return res.redirect(`/lawyers/${lawyerId}`);
    }
    return res.status(200).json(new apiResponse(200, null, "Review deleted successfully"));
});

module.exports = {
    createReview,
    deleteReview,
};
