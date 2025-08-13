const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const messageSchema = new Schema(
    {
        chatRoom: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ChatRoom",
            required: true,
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        receiver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        content: { type: String, required: true },
        seen: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Message", messageSchema);
