const Article = require("../models/article.model");
const User = require("../models/user.model"); // Importing User model
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");

// ✅ Create Article
const createArticle = asyncHandler(async (req, res) => {
    const { title, content, tags } = req.body;
    const author = req.user?._id || req.body.author;

    if (!title?.trim() || !content?.trim()) {
        throw new ApiError(400, "Title and content are required");
    }

    const article = await Article.create({ title, content, tags, author });

    // Check if request expects HTML or JSON
    if (req.accepts("html")) {
        return res.redirect("/articles");
    } else {
        return res
            .status(201)
            .json(
                new ApiResponse(201, article, "Article created successfully")
            );
    }
});

// ✅ Get All Articles
const getAllArticles = asyncHandler(async (req, res) => {
    const articles = await Article.find()
        .populate("author", "name email role")
        .sort({ createdAt: -1 });

    // res.render('pages/articles', { articles });
    return res
        .status(200)
        .json(new ApiResponse(200, articles, "Articles fetched successfully"));
});

// ✅ Get Single Article by ID
const getArticleById = asyncHandler(async (req, res) => {
    const article = await Article.findById(req.params.id).populate(
        "author",
        "name email role"
    );

    if (!article) {
        throw new ApiError(404, "Article not found");
    }

    if (req.accepts("html")) {
        return res.render("pages/article-details", { article });
    } else {
        return res
            .status(200)
            .json(
                new ApiResponse(200, article, "Article fetched successfully")
            );
    }
});

// ✅ Update Article (Only Author or Admin Can Update)
const updateArticle = asyncHandler(async (req, res) => {
    const { title, content, tags } = req.body;
    const article = await Article.findById(req.params.id);

    if (!article) {
        throw new ApiError(404, "Article not found");
    }

    // Check if the logged-in user is the author or an admin
    const isAdmin = req.user?.role === "admin";
    if (article.author.toString() !== req.user?._id.toString() && !isAdmin) {
        throw new ApiError(
            403,
            "Unauthorized: You can only update your own articles"
        );
    }

    article.title = title?.trim() || article.title;
    article.content = content?.trim() || article.content;
    article.tags = tags
        ? tags.split(",").map((tag) => tag.trim())
        : article.tags;

    await article.save();
    if (req.accepts("html")) {
        return res.redirect(`/articles/${article._id}`);
    } else {
        return res
            .status(200)
            .json(
                new ApiResponse(200, article, "Article updated successfully")
            );
    }
});

// ✅ Delete Article (Only Author or Admin Can Delete)
const deleteArticle = asyncHandler(async (req, res) => {
    const article = await Article.findById(req.params.id);

    if (!article) {
        throw new ApiError(404, "Article not found");
    }

    // Check if the logged-in user is the author or an admin
    const isAdmin = req.user?.role === "admin";
    if (article.author.toString() !== req.user?._id.toString() && !isAdmin) {
        throw new ApiError(
            403,
            "Unauthorized: You can only delete your own articles"
        );
    }

    await Article.findByIdAndDelete(req.params.id);

    if (req.accepts("html")) {
        return res.redirect("/articles");
    } else {
        return res
            .status(200)
            .json(new ApiResponse(200, null, "Article deleted successfully"));
    }
});

const publishArticle = asyncHandler(async (req, res) => {
    res.render("pages/article-form");
});

const renderEditForm = asyncHandler(async (req, res) => {
    const article = await Article.findById(req.params.id);
    res.render("pages/edit-article", { article });
});

module.exports = {
    createArticle,
    getAllArticles,
    getArticleById,
    updateArticle,
    deleteArticle,
    publishArticle,
    renderEditForm,
};
