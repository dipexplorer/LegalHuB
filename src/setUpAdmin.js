const mongoose = require("mongoose");
const User = require("./models/user.model.js");
const db_connect = require("./db/index.js"); // fix path if needed
require("dotenv").config();

const ADMIN_USERNAME = "admin";
const ADMIN_EMAIL = "admin@example.com";
const ADMIN_PASSWORD = "SuperSecret@123";

const createOrUpdateAdmin = async () => {
    try {
        let admin = await User.findOne({ role: "admin" });

        if (admin) {
            console.log("⚡ Admin already exists:", admin.email);

            // ✅ Update password if needed
            await admin.setPassword(ADMIN_PASSWORD);
            await admin.save();
            console.log("🔑 Admin password updated to:", ADMIN_PASSWORD);
        } else {
            const newAdmin = new User({
                username: ADMIN_USERNAME,
                email: ADMIN_EMAIL,
                role: "admin",
                isAdmin: true,
            });

            await User.register(newAdmin, ADMIN_PASSWORD);
            console.log("✅ Admin user created successfully!");
            console.log("Email:", ADMIN_EMAIL);
            console.log("Password:", ADMIN_PASSWORD);
        }

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error("❌ Error setting up admin:", err);
        await mongoose.disconnect();
        process.exit(1);
    }
};

// Connect to DB and run
db_connect()
    .then(async () => {
        console.log("✅ MongoDB connected successfully");
        await createOrUpdateAdmin();
    })
    .catch((err) => {
        console.error("❌ MongoDB connection error", err);
        process.exit(1);
    });
