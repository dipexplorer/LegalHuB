const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const lawyerProfileSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
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
                "Other",
            ],
            required: true,
            trim: true,
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
            default: 0,
        },
        reviews: [
            {
                type: Schema.Types.ObjectId,
                ref: "Review",
            },
        ],
        isVerified: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true, // Automatically adds createdAt and updatedAt
    }
);

// Prevent duplicate license numbers
lawyerProfileSchema.index({ licenseNumber: 1 }, { unique: true });

// middleware to delete reviews attached to LawyerProfile
lawyerProfileSchema.post("findOneAndDelete", async (lawyerProfile) => {
    if (lawyerProfile) {
        await Review.deleteMany({ _id: { $in: lawyerProfile.reviews } });
    }
});

module.exports = mongoose.model("LawyerProfile", lawyerProfileSchema);
