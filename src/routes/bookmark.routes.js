const express = require("express");
const {
    createBookmark,
    getAllBookmarkfordocment,
    getAllBookmarkforright,
    deleteBookmark,
} = require("../controllers/bookmark.controller.js");

const { validateIds } = require("../middlewares/bookmark.middleware.js");

const router = express.Router();

// Create Bookmark
router.route("/").post(validateIds, createBookmark);

//  Get All Documents Bookmarked by User
router.route("/docments").get(getAllBookmarkfordocment);

// Get All rights Bookmarked by User
router.route("/rights").get(getAllBookmarkforright);

// Delete Document
router.route("/").delete(deleteBookmark);

module.exports = router;
