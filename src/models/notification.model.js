const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = new Schema(
    {
        recipient: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        type: {
            type: String,
            enum: [
                "appointment.created",
                "appointment.updated",
                "appointment.cancelled",
                "message.new",
                "feedback.submitted",
                "review.posted",
                "system.alert",
            ],
            required: true,
        },
        title: { type: String, required: true }, // Short title e.g. "New Appointment"
        message: {
            type: String,
            required: true,
        },
        // Link to the related resource (optional)
        relatedId: { type: Schema.Types.ObjectId, required: false },
        relatedModel: { type: String, required: false },
        // e.g. "Appointment", "Message", "Document"

        status: {
            type: String,
            enum: ["unread", "read"],
            default: "unread",
        },
        priority: {
            type: String,
            enum: ["low", "normal", "high"],
            default: "normal",
        },

        channels: {
            inApp: { type: Boolean, default: true },
            email: { type: Boolean, default: false },
            sms: { type: Boolean, default: false },
            push: { type: Boolean, default: false },
        },

        createdAt: { type: Date, default: Date.now },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Notification", notificationSchema);
