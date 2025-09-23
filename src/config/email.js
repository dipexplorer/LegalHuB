// src/config/email.js
require("dotenv").config(); // Only if not loaded globally in app.js
const nodemailer = require("nodemailer");

const host = process.env.SMTP_HOST || "smtp.gmail.com";
const port = parseInt(process.env.SMTP_PORT || "587", 10);

const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for 587
    auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
    },
});

// quick verify on startup (non-fatal)
transporter
    .verify()
    .then(() => console.log("✅ SMTP transporter ready"))
    .catch((err) => console.warn("⚠️ SMTP transporter verify failed:", err.message));

module.exports = transporter;
