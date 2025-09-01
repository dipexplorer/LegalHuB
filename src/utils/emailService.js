const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST, // works great for testing
    port: process.env.SMTP_PORT,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

async function sendEmail(options) {
    try {
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: options.to,
            subject: options.subject,
            text: options.text,
            attachments: options.attachments || [],
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent:", info.messageId);
        console.log("Preview:", nodemailer.getTestMessageUrl(info));
        return info;
    } catch (error) {
        console.log("failed to send email:", error.message);
        throw error; // Re-throw error so controller can handle it
    }
}

module.exports = sendEmail;
