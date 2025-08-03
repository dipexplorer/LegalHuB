const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");

const rightsSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true,
        },
        description: {
            type: String,
            required: true,
        },
        articleNumber: {
            type: String,
            required: true,
            trim: true,
        },
        category: {
            type: String,
            required: true,
            enum: [
                "Right to Equality",
                "Right to Freedom",
                "Right Against Exploitation",
                "Right to Freedom of Religion",
                "Cultural and Educational Rights",
                "Right to Constitutional Remedies",
            ],
        },
        sourceLink: {
            type: String,
            required: true,
        }
    },
    { timestamps: true }
);

rightsSchema.plugin(mongoosePaginate);

module.exports = mongoose.model("Right", rightsSchema);
