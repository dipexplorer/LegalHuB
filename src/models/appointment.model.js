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
        ref: "User",
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    timeSlot: {
        type: String, // e.g., "10:00 AM"
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

appointmentSchema.index({ lawyer: 1, date: 1, timeSlot: 1 }, { unique: true }); // Ensure unique lawyer-date-timeSlot combination

module.exports = mongoose.model("Appointment", appointmentSchema);
