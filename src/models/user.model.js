const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new Schema(
    {
        name: {
            type: String,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        googleId: {
            type: String, // Google unique user ID
            unique: true,
            sparse: true, // Allows either local or Google login
        },
        role: {
            type: String,
            enum: ["user", "lawyer", "admin"],
            default: "user",
        },
        profilePicture: {
            type: String,
            default:
                "https://cdn.vectorstock.com/i/1000v/51/87/student-avatar-user-profile-icon-vector-47025187.jpg",
        },
        profilePictureId: {
            type: String, // Cloudinary public_id
            default: null,
        },
        lawyerProfile: {
            type: Schema.Types.ObjectId,
            ref: "LawyerProfile",
            default: null,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        isAdmin: {
            type: Boolean,
            default: false,
        },
        resetToken: String,
        resetTokenExpires: Date,
    },
    {
        timestamps: true,
    }
);

// Add Passport-Local plugin for username & password auth
userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);
