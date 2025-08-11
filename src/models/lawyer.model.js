const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const lawyerProfileSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },
    bio: {
        type: String,
        trim: true,
    },
    specialization: {
        type: String,
        enum: [
            "Criminal Law",
            "Civil Law",
            "Corporate Law",
            "Family Law",
            "Intellectual Property",
            "Tax Law",
            "Labor Law",
            "Real Estate Law",
            "Immigration Law",
            "Other"
        ],
        required: true,
        trim: true
    },
    licenseNumber: {
        type: String,
        required: true,
        trim: true,
    },
    experience: {
        type: Number,
        default: 0,
        min: 0,
    },
    city: {
        type: String,
        trim: true,
    },
    state: {
        type: String,
        trim: true,
    },
    languagesSpoken: {
        type: [String],
        default: [],
    },
    availableSlots: {
        type: [String],
        default: [],
    },
    fees: {
        type: Number,
        default: 0
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true  // Automatically adds createdAt and updatedAt
});

module.exports = mongoose.model("LawyerProfile", lawyerProfileSchema);
