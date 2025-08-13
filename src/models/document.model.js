const mongoose = require("mongoose");
const indianStates = require("../utils/indianStates.js");

const documentSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            unique: true,
        },
        description: {
            type: String,
            required: true,
        },
        downloadLink: {
            type: String,
            required: true,
        },
        applyLink: {
            type: String,
            required: true,
        },
        state: {
            type: String,
            required: true,
            enum: {
                values: indianStates,
                message: "Not a valid Indian state'",
            },
        },
        department: {
            type: String,
            required: true,
        },
        guidelines: {
            type: [String], // Store guidelines as an array of strings (points)
            required: true,
        },
        requiredDocuments: {
            type: [String], // Store required documents as an array of strings
            required: true,
        },
        downloadCount: { type: Number, default: 0 }, // New field for tracking downloads
        downloadedBy: [
            {
                username: String, // Store the username of the user who downloaded
                downloadedAt: {
                    type: Date,
                    default: Date.now, // Track when they downloaded it
                },
            },
        ],
    },
    { timestamps: true }
);

const Document = mongoose.model("Document", documentSchema);

module.exports = Document;
