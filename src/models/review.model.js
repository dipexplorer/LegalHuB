const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
    client: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    lawyer: {
        type: Schema.Types.ObjectId,
        ref: "LawyerProfile",
        required: true
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    comment: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Review", reviewSchema);
