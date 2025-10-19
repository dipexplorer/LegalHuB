const mongoose = require("mongoose");

const securitySettingsSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
        notifications: {
            newLogin: {
                type: Boolean,
                default: true,
            },
            passwordChange: {
                type: Boolean,
                default: true,
            },
            twoFactorChange: {
                type: Boolean,
                default: true,
            },
        },
        recoveryEmail: {
            type: String,
            validate: {
                validator: function (v) {
                    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
                },
                message: "Please enter a valid email address",
            },
        },
        recoveryPhone: {
            type: String,
            validate: {
                validator: function (v) {
                    return /^\+?[\d\s-]{8,}$/.test(v);
                },
                message: "Please enter a valid phone number",
            },
        },
        securityQuestions: [
            {
                question: String,
                answer: String, // Should be hashed before saving
            },
        ],
        lastPasswordChange: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

const SecuritySettings = mongoose.model("SecuritySettings", securitySettingsSchema);
module.exports = SecuritySettings;
