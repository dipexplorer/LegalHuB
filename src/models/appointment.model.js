const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const appointmentSchema = new Schema({
    client: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    lawyer: {
        type: Schema.Types.ObjectId,
        ref: "User", // storing the User._id of lawyer
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    timeSlot: {
        type: [String],
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected", "cancelled", "completed"],
        default: "pending"
    },
    notes: {
        type: String,
        trim: true
    },
}, {
    timestamps: true
});

// Prevent double-booking: unique per lawyer+date+timeSlot
appointmentSchema.index({ lawyer: 1, date: 1, timeSlot: 1 }, { unique: true });

module.exports = mongoose.model("Appointment", appointmentSchema);
