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
        enum: ["user", "admin"],
        default: "user",
    },
    profilePicture: {
        type: String,
        //if no profile given default store
        // default: 'https://cdn.vectorstock.com/i/1000v/51/87/student-avatar-user-profile-icon-vector-47025187.jpg',
    },
    specialization: {
        type: String,
        trim: true,
    },
    licenseNumber: {
        type: String,
    },
    experience: {
        type: Number, // ✅ Lawyer ke experience ko handle karega
        default: 0,
        min: 0,
    },
    resetToken: String,
    resetTokenExpires: Date,
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);
