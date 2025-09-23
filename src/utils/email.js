// src/utils/email.js
const transporter = require("../config/email.js");

const defaultFrom =
    process.env.SMTP_FROM || `"Law Portal" <${process.env.SMTP_USER || process.env.EMAIL_USER}>`;

const sendEmail = async ({ to, subject, html, text }) => {
    const mailOptions = {
        from: defaultFrom,
        to,
        subject,
        html,
        text,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log("📧 Email sent:", info.messageId, "to", to);
        return info; // caller can use this to log/message-id, etc.
    } catch (error) {
        // Log and return null to avoid throwing inside notification pipeline.
        // In some flows you may want to rethrow so the caller can retry.
        console.error("❌ sendEmail error:", error);
        return null;
    }
};

module.exports = sendEmail;
