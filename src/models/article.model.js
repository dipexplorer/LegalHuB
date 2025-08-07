const mongoose = require("mongoose");

// List Schema for bullets or numbered points
const ListItemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["bullet", "number"],
      required: true,
    },
    items: {
      type: [String],
      validate: {
        validator: function (items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: "List must contain at least one item.",
      },
    },
  },
  { _id: false }
);

// Section Schema with subheading, content (HTML), and optional list
const SectionSchema = new mongoose.Schema(
  {
    subheading: {
      type: String,
      trim: true,
      required: false,
    },
    content: {
      type: String, // HTML from WYSIWYG editor
      trim: true,
    },
    list: {
      type: ListItemSchema,
      required: false,
    },
  },
  { _id: false }
);

// Main Article Schema
const articleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      unique: true,
    },
    introduction: {
      type: String,
      trim: true,
    },
    sections: {
      type: [SectionSchema],
      default: [],
    },
    conclusion: {
      type: String,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function (tags) {
          return Array.isArray(tags) && new Set(tags).size === tags.length;
        },
        message: "Tags must be unique",
      },
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author is required"],
    },
    publishedAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Article", articleSchema);
