const mongoose = require("mongoose");
const { Schema } = mongoose;

const SubscriptionSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: "User", required: false },
    endpoint: { type: String, required: true },
    keys: {
        p256dh: { type: String },
        auth: { type: String },
    },
    createdAt: { type: Date, default: Date.now },
});

SubscriptionSchema.index({ user: 1, endpoint: 1 }, { unique: true });

module.exports = mongoose.model("Subscription", SubscriptionSchema);
