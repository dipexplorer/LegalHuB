const Article = require("../models/article.model");
const User = require("../models/user.model"); // Importing User model
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const sanitizeHtml = require("sanitize-html");

// ✅ Create Article
const createArticle = asyncHandler(async (req, res) => {
    let {
        title,
        introduction,
        conclusion,
        sectionSubheadings,
        sectionContents,
        sectionListTypes,
        sectionListItems,
        tags,
    } = req.body;

    const author = req.user?._id || req.body.author;

    // Normalize all section-related fields to arrays
    const toArray = (val) => (Array.isArray(val) ? val : val ? [val] : []);
    sectionSubheadings = toArray(sectionSubheadings);
    sectionContents = toArray(sectionContents);
    sectionListTypes = toArray(sectionListTypes);
    sectionListItems = toArray(sectionListItems);

    if (!title?.trim()) {
        throw new ApiError(400, "Title is required");
    }

    if (sectionContents.length === 0 || sectionContents.every((content) => !content.trim())) {
        throw new ApiError(400, "At least one section with content is required");
    }

    const sections = sectionContents.map((content, index) => {
        const section = {
            subheading: sectionSubheadings[index] || "",
            content: content.trim(),
        };

        const listType = sectionListTypes[index];
        const rawListItems = sectionListItems[index];

        if (listType && rawListItems) {
            const items = rawListItems
                .split("\n")
                .map((item) => item.trim())
                .filter((item) => item);

            if (items.length > 0) {
                section.list = {
                    type: listType,
                    items,
                };
            }
        }

        return section;
    });

    const article = await Article.create({
        title: title.trim(),
        introduction: introduction?.trim(),
        conclusion: conclusion?.trim(),
        sections,
        tags: tags ? tags.split(",").map((tag) => tag.trim()) : [],
        author,
    });

    if (req.accepts("html")) {
        return res.redirect("/articles");
    } else {
        return res.status(201).json(new ApiResponse(201, article, "Article created successfully"));
    }
});

// ✅ Get All Articles
const getAllArticles = asyncHandler(async (req, res) => {
    const articles = await Article.find()
        .populate("author", "name email role")
        .sort({ createdAt: -1 });

    // res.render('pages/articles', { articles });
    return res.status(200).json(new ApiResponse(200, articles, "Articles fetched successfully"));
});

// ✅ Sanitize HTML
const cleanHtml = (html) =>
    sanitizeHtml(html || "", {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat([
            "img",
            "h1",
            "h2",
            "u",
            "strong",
            "em",
            "ul",
            "ol",
            "li",
            "blockquote",
            "br",
        ]),
        allowedAttributes: {
            "*": ["href", "src", "alt"],
        },
        transformTags: {
            "*": (tagName, attribs) => {
                delete attribs.style; // ✅ Remove all inline styles
                return { tagName, attribs };
            },
            div: "p", // Replace <div> with <p> to maintain spacing
            span: "p", // Replace <span> with <p> if outside formatting
        },
        exclusiveFilter: (frame) =>
            // ✅ Remove empty tags with no visible content
            (frame.tag === "p" || frame.tag === "div" || frame.tag === "span") &&
            !frame.text.trim(),
    });

// ✅ Get Article by ID
const getArticleById = asyncHandler(async (req, res) => {
    const article = await Article.findById(req.params.id).populate("author", "name email role");

    if (!article) {
        throw new ApiError(404, "Article not found");
    }

    // ✅ Sanitize all HTML content
    const sanitizedSections = article.sections.map((section) => ({
        ...section.toObject(),
        content: cleanHtml(section.content),
    }));

    const cleanArticle = {
        ...article.toObject(),
        introduction: cleanHtml(article.introduction),
        conclusion: cleanHtml(article.conclusion),
        sections: sanitizedSections,
    };

    if (req.accepts("html")) {
        return res.render("pages/article-details", { article: cleanArticle });
    } else {
        return res
            .status(200)
            .json(new ApiResponse(200, cleanArticle, "Article fetched successfully"));
    }
});

// ✅ Update Article (Only Author or Admin Can Update)
const updateArticle = asyncHandler(async (req, res) => {
    let {
        title,
        introduction,
        conclusion,
        sectionSubheadings,
        sectionContents,
        sectionListTypes,
        sectionListItems,
        tags,
    } = req.body;

    const article = await Article.findById(req.params.id);

    if (!article) {
        throw new ApiError(404, "Article not found");
    }

    // Authorization check
    const isAdmin = req.user?.role === "admin";
    if (article.author.toString() !== req.user?._id.toString() && !isAdmin) {
        throw new ApiError(403, "Unauthorized: You can only update your own articles");
    }

    // Normalize section-related fields
    const toArray = (val) => (Array.isArray(val) ? val : val ? [val] : []);
    sectionSubheadings = toArray(sectionSubheadings);
    sectionContents = toArray(sectionContents);
    sectionListTypes = toArray(sectionListTypes);
    sectionListItems = toArray(sectionListItems);

    // Validate at least one section has content
    if (sectionContents.length === 0 || sectionContents.every((content) => !content.trim())) {
        throw new ApiError(400, "At least one section with content is required");
    }

    // Build updated sections
    const updatedSections = sectionContents.map((content, index) => {
        const section = {
            subheading: sectionSubheadings[index] || "",
            content: content.trim(),
        };

        const listType = sectionListTypes[index];
        const rawListItems = sectionListItems[index];

        if (listType && rawListItems) {
            const items = rawListItems
                .split("\n")
                .map((item) => item.trim())
                .filter((item) => item);

            if (items.length > 0) {
                section.list = {
                    type: listType,
                    items,
                };
            }
        }

        return section;
    });

    // Apply updates
    article.title = title?.trim() || article.title;
    article.introduction = introduction?.trim() || article.introduction;
    article.conclusion = conclusion?.trim() || article.conclusion;
    article.sections = updatedSections;
    article.tags = tags ? tags.split(",").map((tag) => tag.trim()) : article.tags;

    await article.save();

    if (req.accepts("html")) {
        return res.redirect(`/api/articles/${article._id}`);
    } else {
        return res.status(200).json(new ApiResponse(200, article, "Article updated successfully"));
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
        throw new ApiError(403, "Unauthorized: You can only delete your own articles");
    }

    await Article.findByIdAndDelete(req.params.id);

    if (req.accepts("html")) {
        return res.redirect("/articles");
    } else {
        return res.status(200).json(new ApiResponse(200, null, "Article deleted successfully"));
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