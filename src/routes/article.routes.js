const express = require("express");
const {
    createArticle,
    getAllArticles,
    getArticleById,
    updateArticle,
    deleteArticle,
} = require("../controllers/article.controller.js");
const { isLoggedIn } = require("../middlewares/auth.middleware.js");
const ApiError = require("../utils/apiError.js");
const ApiResponse = require("../utils/apiResponse.js");
const Article = require("../models/article.model.js");
const asyncHandler = require("../utils/asyncHandler.js");

const router = express.Router();

// ✅ Middleware to Check if User is Author or Admin

const isAuthorOrAdmin = asyncHandler(async (req, res, next) => {
    try {
        const article = await Article.findById(req.params.id);

        if (!article) return next(new ApiError(404, "Article not found"));

        if (article.author.toString() === req.user._id.toString() || req.user.isAdmin) {
            return next(); // ✅ Allow access
        }

        return next(new ApiError(403, "You are not authorized to edit/delete this article"));
    } catch (error) {
        next(new ApiError(500, "Server error while checking permissions"));
    }
});

// ✅ Public Routes
router
    .route("/")
    .get(getAllArticles) // Get all articles (Public)
    .post(isLoggedIn, createArticle); // ✅ Authenticated users can create articles

router
    .route("/:id")
    .get(getArticleById) // Get a single article (Public)
    .put(isLoggedIn, isAuthorOrAdmin, updateArticle) // ✅ Allow authors/admins
    .delete(isLoggedIn, isAuthorOrAdmin, deleteArticle); // ✅ Allow authors/admins

module.exports = router;
