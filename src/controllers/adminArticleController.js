const User = require("../models/user.model.js");
const Article = require("../models/article.model.js");
const asyncHandler = require("../utils/asyncHandler.js");
const apiResponse = require("../utils/apiResponse.js");
const apiError = require("../utils/apiError.js");

// Get all articles with search, filters, pagination
const getAllArticles = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, search = "", sort = "createdAt_desc", tag } = req.query;

    const parsedLimit = parseInt(limit) || 10;
    const skip = (page - 1) * parsedLimit;

    // Filters
    let filter = {};
    if (search) {
        filter.$or = [
            { title: { $regex: search, $options: "i" } },
            { introduction: { $regex: search, $options: "i" } },
            { tags: { $regex: search, $options: "i" } },
        ];
    }
    if (tag) {
        filter.tags = tag;
    }

    // Sorting
    const sortOptions = {
        createdAt_desc: { createdAt: -1 },
        createdAt_asc: { createdAt: 1 },
        publishedAt_desc: { publishedAt: -1 },
        publishedAt_asc: { publishedAt: 1 },
        title_asc: { title: 1 },
        title_desc: { title: -1 },
    }[sort] || { createdAt: -1 };

    // Query
    const [articles, totalArticles, uniqueTags] = await Promise.all([
        Article.find(filter)
            .populate("author", "username name email profilePicture")
            .sort(sortOptions)
            .skip(skip)
            .limit(parsedLimit),
        Article.countDocuments(filter),
        Article.distinct("tags"),
    ]);

    if (req.accepts("html")) {
        return res.render("admin/articles", {
            articles,
            totalArticles,
            uniqueTags,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalArticles / parsedLimit),
            search,
            sort,
            tag,
            limit: parsedLimit,
        });
    }

    res.status(200).json(
        new apiResponse(200, { articles, totalArticles }, "Articles fetched successfully")
    );
});

// Delete article
const deleteArticle = asyncHandler(async (req, res) => {
    const article = await Article.findById(req.params.id);
    if (!article) throw new apiError(404, "Article not found");

    await article.deleteOne();

    if (req.accepts("html")) {
        req.flash("success", "Article deleted successfully");
        return res.redirect("/api/admin/dashboard/articles");
    }

    res.status(200).json(new apiResponse(200, article, "Article deleted successfully"));
});

module.exports = {
    getAllArticles,
    deleteArticle,
};
