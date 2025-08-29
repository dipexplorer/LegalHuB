const mongoose = require("mongoose");

const bookmarkSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        documents: [{ type: mongoose.Schema.Types.ObjectId, ref: "Document" }],
        rights: [{ type: mongoose.Schema.Types.ObjectId, ref: "Right" }],
    },
    { timestamps: true }
);

module.exports = mongoose.model("Bookmark", bookmarkSchema);
