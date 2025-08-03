const Document = require("../models/document.model.js");
const Article = require("../models/article.model.js");
const Right = require("../models/rights.model.js");
const asyncHandler = require("../utils/asyncHandler.js");
const ApiError = require("../utils/apiError.js");
const ApiResponse = require("../utils/apiResponse.js");
const User = require("../models/user.model.js");

const renderHome = (req, res) => {
    res.render("pages/index");
};

const renderDictionary = (req, res) => {
    res.render("pages/dictionary");
};

const renderDocument = asyncHandler(async (req, res) => {
    const documents = await Document.find();

    // ✅ Render ke andar `documents` pass karna zaroori hai
    res.render("pages/documents", { documents });
});

const renderArticles = asyncHandler(async (req, res) => {
    const articles = await Article.find()
        .populate("author", "name email")
        .sort({ createdAt: -1 });
    res.render("pages/articles", { articles });
});

const renderFundamental = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    // ✅ Total rights count karo
    const totalRights = await Right.countDocuments();

    // ✅ Rights ko paginate karo
    const rights = await Right.find().skip(skip).limit(limit);

    res.render("pages/fundamental", {
        rights,
        currentPage: page,
        totalPages: Math.ceil(totalRights / limit),
    });
});

const renderAbout = (req, res) => {
    res.render("pages/about");
};

const renderPrivacyPolicy = asyncHandler(async (req, res) => {
    res.render("pages/privacy");
});

const renderTermsAndConditions = asyncHandler(async (req, res) => {
    res.render("pages/terms");
});

const renderLoginForm = async (req, res) => {
    res.render("users/login", {
        success: req.flash("success"),
        error: req.flash("error"),
    });
};

const getLawyers = asyncHandler(async (req, res) => {
    const lawyers = await User.find({});
    res.render("pages/lawyers", { lawyers });
});

module.exports = {
    renderHome,
    renderDictionary,
    renderDocument,
    renderArticles,
    renderFundamental,
    renderPrivacyPolicy,
    renderTermsAndConditions,
    renderAbout,
    renderLoginForm,
    getLawyers,
};
