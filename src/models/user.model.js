const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new Schema({
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
    role: {
        type: String,
        enum: ["user", "lawyer", "admin"],
        default: "user",
    },
    profilePicture: {
        type: String,
        default: 'https://cdn.vectorstock.com/i/1000v/51/87/student-avatar-user-profile-icon-vector-47025187.jpg',
    },
    lawyerProfile: {
        type: Schema.Types.ObjectId,
        ref: "LawyerProfile",
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    resetToken: String,
    resetTokenExpires: Date,
}
, {
    timestamps: true
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);
