const transporter = require("../config/email.js");

const sendEmail = async ({ to, subject, html }) => {
    const mailOptions = {
        from: `"Law Portal" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("📧 Email sent to", to);
    } catch (error) {
        console.error("❌ Email error:", error);
    }
};

module.exports = sendEmail;
