const Notification = require("../models/notification.model.js");

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
        channels = { inApp: true },
    } = options;

    if (!user || !type || !title || !message) {
        throw new Error("Missing required fields for notification");
    }

    const notification = new Notification({
        user,
        type,
        title,
        message,
        relatedId,
        relatedModel,
        priority,
        channels,
    });

    await notification.save();

    // 👉 Emit in real time
    // const io = req.app.get("io");
    io.to(user.toString()).emit("newNotification", notification);

    // 👉 Future: here we can also trigger email, push, etc.
    return notification;
}

module.exports = { createNotification };
