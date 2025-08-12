const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const chatRoomSchema = new Schema(
    {
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
        ],
        appointment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Appointment",
        }, // link to booking
        lastMessage: { type: String },
    },
    {
        timestamps: true,
    }
);

chatRoomSchema.index({ participants: 1 });
module.exports = mongoose.model("ChatRoom", chatRoomSchema);
