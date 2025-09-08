const Bookmark = require("../models/bookmark.model");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");

// @desc Create a new bookmark
const createBookmark = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { documentId, rightId } = req.body;

    if (!userId) {
        return res.status(400).json(new ApiResponse(400, null, "userId is required"));
    }

    // Find existing bookmark for the user
    let bookmark = await Bookmark.findOne({ userId });

    if (!bookmark) {
        // Create new bookmark
        const newBookmark = await Bookmark.create({
            userId,
            documents: documentId ? [documentId] : [],
            rights: rightId ? [rightId] : [],
        });

        return res
            .status(201)
            .json(new ApiResponse(201, newBookmark, "Bookmark created successfully"));
    } else {
        // Ensure arrays exist
        bookmark.documents = bookmark.documents || [];
        bookmark.rights = bookmark.rights || [];

        // Add new items if provided and avoid duplicates
        if (documentId && !bookmark.documents.includes(documentId)) {
            bookmark.documents.push(documentId);
        }

        if (rightId && !bookmark.rights.includes(rightId)) {
            bookmark.rights.push(rightId);
        }

        await bookmark.save();

        return res
            .status(200)
            .json(new ApiResponse(200, bookmark, "Bookmark updated successfully"));
    }
});

// Get all bookmarks of docments for a user
const getAllBookmarkfordocment = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const bookmark = await Bookmark.find({ userId }).select("-rights").populate("documents");

    res.status(201).json(new ApiResponse(200, bookmark));
});

// Get all bookmarks of rights for a user
const getAllBookmarkforright = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const bookmark = await Bookmark.find({ userId }).select("-documents").populate("rights");
    res.status(201).json(new ApiResponse(200, bookmark));
});

// delete a bookmark for a user
const deleteBookmark = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { documentId, rightId } = req.body;

    const bookmark = await Bookmark.findOne({ userId });
    if (!bookmark) {
        return res.status(404).json(new ApiError(404, "Bookmark not found"));
    }

    if (documentId) {
        bookmark.documents.pull(documentId);
    }

    if (rightId) {
        bookmark.rights.pull(rightId);
    }

    await bookmark.save();

    res.status(200).json(new ApiResponse(200, bookmark, "Bookmark deleted successfully"));
});

module.exports = {
    createBookmark,
    getAllBookmarkfordocment,
    getAllBookmarkforright,
    deleteBookmark,
};
