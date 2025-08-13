const Right = require("../models/rights.model.js");
const Document = require("../models/document.model.js");
const asyncHandler = require("../utils/asyncHandler.js");
const ApiError = require("../utils/apiError.js");
const ApiResponse = require("../utils/apiResponse.js");

// ✅ Smart Search API
const smartSearch = asyncHandler(async (req, res) => {
    const { query } = req.query;

    if (!query) {
        throw new ApiError(400, "Search query is required");
    }

    // **MongoDB Text Search + Regex Search**
    const rights = await Right.find({
        $or: [
            { name: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
        ],
    });

    const documents = await Document.find({
        $or: [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
            { state: { $regex: query, $options: "i" } },
            { department: { $regex: query, $options: "i" } }, // ✅ Fixed category → department
        ],
    });

    // const articles = await Article.find({
    //     $or: [
    //         { title: { $regex: query, $options: 'i' } },
    //         { content: { $regex: query, $options: 'i' } },
    //         { tags: { $in: [new RegExp(query, 'i')] } },
    //         { category: { $regex: query, $options: 'i' } }
    //     ]
    // });

    const results = {
        rights,
        documents,
        // articles
    };

    res.status(200).json(new ApiResponse(200, results, "Search results fetched successfully"));
});

module.exports = { smartSearch };
