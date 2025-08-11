const Right = require("../models/rights.model");
const asyncHandler = require("../utils/asyncHandler.js");
const ApiError = require("../utils/apiError.js");
const ApiResponse = require("../utils/apiResponse.js");

// ✅ Create a Right
const createRight = asyncHandler(async (req, res) => {
    const { name, description, articleNumber, sourceLink, category } = req.body;

    // 🚫 Check for missing fields
    if (!name || !description || !articleNumber || !sourceLink || !category) {
        throw new ApiError(400, "All fields are required");
    }

    // 🚫 Check if category is valid
    const validCategories = [
        "Right to Equality",
        "Right to Freedom",
        "Right Against Exploitation",
        "Right to Freedom of Religion",
        "Cultural and Educational Rights",
        "Right to Constitutional Remedies",
    ];
    if (!validCategories.includes(category)) {
        throw new ApiError(400, "Invalid category provided");
    }

    // 🚫 Check for duplicate name
    const existingRight = await Right.findOne({ name });
    if (existingRight) {
        throw new ApiError(400, "A right with this name already exists");
    }

    // ✅ Create new Right
    const right = await Right.create({
        name,
        description,
        articleNumber,
        sourceLink,
        category,
    });

    // ✅ Send response
    res.status(201).json(
        new ApiResponse(201, right, "Right created successfully")
    );
});

// ✅ Get All Rights
const getAllRights = asyncHandler(async (req, res) => {
    const rights = await Right.find();
    if (req.accepts("html")) {
        return res.render("pages/fundamental", { rights });
    } else {
        return res
            .status(200)
            .json(new ApiResponse(200, rights, "Rights fetched successfully"));
    }
});

// ✅ Get Right by ID
const getRightById = asyncHandler(async (req, res) => {
    const right = await Right.findById(req.params.id);

    if (!right) {
        throw new ApiError(404, "Right not found");
    }

    if (req.accepts("html")) {
        return res.render("pages/right-details", { right });
    } else {
        return res
            .status(200)
            .json(new ApiResponse(200, right, "Right fetched successfully"));
    }
});

// ✅ Update Right
const updateRight = asyncHandler(async (req, res) => {
    const { name, description, articleNumber, sourceLink, category } = req.body;

    // 🔍 Find existing Right
    const right = await Right.findById(req.params.id);
    if (!right) {
        throw new ApiError(404, "Right not found");
    }

    // 🛡️ Validate category if it's being updated
    const validCategories = [
        "Right to Equality",
        "Right to Freedom",
        "Right Against Exploitation",
        "Right to Freedom of Religion",
        "Cultural and Educational Rights",
        "Right to Constitutional Remedies",
    ];
    if (category && !validCategories.includes(category)) {
        throw new ApiError(400, "Invalid category provided");
    }

    // 🛠️ Apply updates (fallback to existing values if not provided)
    right.name = name || right.name;
    right.description = description || right.description;
    right.articleNumber = articleNumber || right.articleNumber;
    right.sourceLink = sourceLink || right.sourceLink;
    right.category = category || right.category;

    // 💾 Save updated Right
    await right.save();

    res.status(200).json(
        new ApiResponse(200, right, "Right updated successfully")
    );
});

// ✅ Delete Right
const deleteRight = asyncHandler(async (req, res) => {
    const right = await Right.findById(req.params.id);
    if (!right) {
        throw new ApiError(404, "Right not found");
    }

    await right.deleteOne();

    res.status(200).json(
        new ApiResponse(200, null, "Right deleted successfully")
    );
});

module.exports = {
    createRight,
    getAllRights,
    getRightById,
    updateRight,
    deleteRight,
};
