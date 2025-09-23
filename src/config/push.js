// src/config/push.js
const webPush = require("web-push");

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const contact = process.env.PUSH_CONTACT_EMAIL || "mailto:admin@yourdomain.com";

const enabled = Boolean(publicKey && privateKey);

if (enabled) {
    try {
        webPush.setVapidDetails(contact, publicKey, privateKey);
        console.log("✅ VAPID details configured successfully");
    } catch (error) {
        console.error("❌ Error setting VAPID details:", error);
    }
} else {
    console.warn(
        "⚠️ VAPID keys not set. Run: npx web-push generate-vapid-keys and set VAPID_PUBLIC_KEY & VAPID_PRIVATE_KEY"
    );
}

module.exports = { webPush, enabled, publicKey };
