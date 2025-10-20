const mongoose = require("mongoose");

const loginActivitySchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        device: {
            type: String,
            required: true,
        },
        browser: {
            type: String,
            required: true,
        },
        ip: {
            type: String,
            required: true,
        },
        location: {
            type: String,
            default: "Unknown",
        },
        status: {
            type: String,
            enum: ["success", "failed", "suspicious"],
            default: "success",
        },
        sessionId: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

// Index for quick lookup of user's recent activity
loginActivitySchema.index({ user: 1, createdAt: -1 });

const LoginActivity = mongoose.model("LoginActivity", loginActivitySchema);
module.exports = LoginActivity;
