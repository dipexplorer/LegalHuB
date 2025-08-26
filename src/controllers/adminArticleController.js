const User = require("../models/user.model.js");
const Article = require("../models/article.model.js");
const asyncHandler = require("../utils/asyncHandler.js");
const apiResponse = require("../utils/apiResponse.js");
const apiError = require("../utils/apiError.js");

// Get all articles
const getAllArticles = asyncHandler(async (req, res) => {
  const articles = await Article.find()
    .populate("author", "username name email profilePicture")
    .sort({ createdAt: -1 });

  if (req.accepts("html")) {
    return res.render("admin/articles", { articles });
  }
  res.status(200).json(new apiResponse(200, articles, "Articles fetched successfully"));
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
}