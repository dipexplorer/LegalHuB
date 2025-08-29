const ApiError = require("../utils/apiError");
const Document = require("../models/document.model");
const Right = require("../models/rights.model");

// Middleware to validate IDs
const validateIds = async (req, res, next) => {
    try {
        const { documentId, rightId } = req.body;

        // Validate documentId if provided
        if (documentId) {
            const document = await Document.findById(documentId);
            if (!document) {
                return res.status(400).json(new ApiError(400, "Invalid Document ID"));
            }
        }

        // Validate rightId if provided
        if (rightId) {
            const right = await Right.findById(rightId);
            if (!right) {
                return res.status(400).json(new ApiError(400, "Invalid Right ID"));
            }
        }

        next();
    } catch (err) {
        return res.status(500).json(new ApiError(500, err.message));
    }
};

module.exports = {
    validateIds,
};
