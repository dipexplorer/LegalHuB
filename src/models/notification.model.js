const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notificationSchema = new Schema({
    recipient: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    message: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ["info", "warning", "appointment", "system"],
        default: "info"
    },
    isRead: {
        type: Boolean,
        default: false
    },
}, {
    timestamps: true
});

module.exports = mongoose.model("Notification", notificationSchema);
