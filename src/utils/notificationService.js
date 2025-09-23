const Notification = require("../models/notification.model.js");
const sendEmail = require("../utils/email.js");
const Subscription = require("../models/subscription.model");
const { webPush, enabled } = require("../config/push");

/**
 * Create and save a notification
 * @param {Object} options - Notification data
 * @param {ObjectId} options.user - Recipient user ID
 * @param {String} options.type - Event type (appointment.created, message.new, etc.)
 * @param {String} options.title - Short title for notification
 * @param {String} options.message - Detailed message
 * @param {ObjectId} [options.relatedId] - Related resource ID
 * @param {String} [options.relatedModel] - Related resource model name
 * @param {String} [options.priority] - low | normal | high
 * @param {Object} [options.channels] - Which channels to use (inApp/email/etc.)
 * @param {String} [options.email] - Recipient email (if email notifications enabled)
 * @param {Object} io - Socket.io instance
 */

async function createNotification(io, options) {
    const {
        user,
        type,
        title,
        message,
        relatedId = null,
        relatedModel = null,
        priority = "normal",
        channels = {},
        email,
    } = options;

    if (!user || !type || !title || !message) {
        throw new Error("Missing required fields for notification");
    }

    const defaultChannels = { inApp: true, email: false, push: false };
    const finalChannels = { ...defaultChannels, ...channels };

    const notification = new Notification({
        user,
        type,
        title,
        message,
        relatedId,
        relatedModel,
        priority,
        channels: finalChannels,
    });

    await notification.save();

    // 🔔 In-app notification via socket
    if (finalChannels.inApp && io) {
        try {
            io.to(user.toString()).emit("newNotification", notification);
        } catch (err) {
            console.error("Socket emit error:", err);
        }
    }

    // 📧 Email notification
    if (finalChannels.email && email) {
        try {
            await sendEmail({
                to: email,
                subject: `New Notification: ${title}`,
                html: `
                    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                        <h2 style="color: #2c3e50; text-align: center; margin-bottom: 20px;">Law Portal Notification</h2>
                        <p style="font-size: 16px;">Hello,</p>
                        <p style="font-size: 15px;">${message}</p>
                        <div style="text-align: center; margin: 30px 0;">
                        <a href="${process.env.APP_URL}/notifications" 
                            style="display: inline-block; background-color: #007bff; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 5px; font-size: 16px;">
                            View Details
                        </a>
                        </div>
                        <p style="font-size: 14px; color: #555;">If the button above doesn’t work, copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; font-size: 13px; color: #0066cc;">${process.env.APP_URL}/notifications</p>
                        <hr style="margin: 30px 0;">
                        <p style="font-size: 12px; color: #999; text-align: center;">This is an automated message from Law Portal. Please do not reply.</p>
                    </div>`,
            });
        } catch (err) {
            console.error("Email send error:", err);
        }
    }

    // 📲 Push notification
    if (finalChannels.push && enabled) {
        try {
            const subs = await Subscription.find({ user });
            const payload = JSON.stringify({
                title,
                body: message,
                icon: "/pic/logo.png",
                data: {
                    url:
                        relatedId && relatedModel
                            ? `${process.env.APP_URL}/${relatedModel.toLowerCase()}/${relatedId}`
                            : `${process.env.APP_URL}/notifications`,
                },
                type,
                priority,
                notificationId: notification._id,
            });

            await Promise.all(
                subs.map(async (subDoc) => {
                    const sub = { endpoint: subDoc.endpoint, keys: subDoc.keys };
                    try {
                        await webPush.sendNotification(
                            { endpoint: subDoc.endpoint, keys: subDoc.keys },
                            payload
                        );
                    } catch (err) {
                        console.error("Push send error:", err && err.message ? err.message : err);
                        // cleanup expired subscription
                        if (err.statusCode === 410 || err.statusCode === 404) {
                            try {
                                await Subscription.deleteOne({ _id: subDoc._id });
                            } catch (e) {
                                console.error("Failed to delete expired subscription:", e);
                            }
                        }
                    }
                })
            );
        } catch (err) {
            console.error("Failed to send push notifications:", err);
        }
    }

    // 👉 Future: here we can also trigger email, push, etc.
    return notification;
}

/**
 * Send a push notification to a specific user
 * @param {ObjectId} userId - Recipient user ID
 * @param {Object} payload - Push notification payload
 * @param {String} payload.title - Notification title
 * @param {String} payload.body - Notification body
 * @param {String} [payload.icon] - Notification icon URL
 * @param {Object} [payload.data] - Additional data
 */
async function sendPushNotification(userId, payload) {
    try {
        // Find all push subscriptions for this user
        const subscriptions = await Subscription.find({ user: userId });

        if (subscriptions.length === 0) {
            return { success: false, message: "No push subscriptions found for this user" };
        }

        const payloadString = JSON.stringify(payload);
        const results = [];

        await Promise.all(
            subscriptions.map(async (sub) => {
                try {
                    await webPush.sendNotification(
                        {
                            endpoint: sub.endpoint,
                            keys: sub.keys,
                        },
                        payloadString
                    );
                    results.push({ status: "ok" });
                } catch (err) {
                    console.error("Push send error:", err.statusCode || err);
                    results.push({ status: "failed", error: err.message });
                    // If subscription expired / revoked, remove it
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        await Subscription.findByIdAndDelete(sub._id);
                    }
                }
            })
        );

        return { success: true, results };
    } catch (err) {
        console.error("Error sending push notification:", err);
        return { success: false, error: err.message };
    }
}

module.exports = { createNotification, sendPushNotification };
