const Document = require("../models/document.model.js");
const asyncHandler = require("../utils/asyncHandler.js");
const apiResponse = require("../utils/apiResponse.js");
const apiError = require("../utils/apiError.js");
const indianStates = require("../utils/indianStates.js");

// GET /admin/documents
const getAllDocuments = asyncHandler(async (req, res) => {
  const q = req.query.q || "";
  const state = req.query.state || "";
  const dept = req.query.dept || "";
  const sort = req.query.sort || "createdAt_desc";
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  // Filters
  let filter = {};
  if (q) {
    filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { department: { $regex: q, $options: "i" } },
      { description: { $regex: q, $options: "i" } },
    ];
  }
  if (state) filter.state = state;
  if (dept) filter.department = dept;

  // Sorting
  let sortOptions = {};
  switch (sort) {
    case "title_asc": sortOptions = { title: 1 }; break;
    case "title_desc": sortOptions = { title: -1 }; break;
    case "downloads_desc": sortOptions = { downloadCount: -1 }; break;
    case "downloads_asc": sortOptions = { downloadCount: 1 }; break;
    case "updated_desc": sortOptions = { updatedAt: -1 }; break;
    case "updated_asc": sortOptions = { updatedAt: 1 }; break;
    default: sortOptions = { createdAt: -1 };
  }

  const skip = (page - 1) * limit;
  const [documents, totalDocs, depts] = await Promise.all([
    Document.find(filter).sort(sortOptions).skip(skip).limit(limit),
    Document.countDocuments(filter),
    Document.distinct("department"),
  ]);

  const totalPages = Math.ceil(totalDocs / limit);

  if (req.accepts("html")) {
    return res.render("admin/documents", {
      documents,
      pagination: { totalDocs, totalPages, currentPage: page, limit },
      filters: { q, state, dept, sort },
      states: indianStates,
      depts,
    });
  }

  return res.status(200).json(
    apiResponse.successResponse(200, "Documents fetched successfully", {
      documents,
      pagination: { totalDocs, totalPages, currentPage: page, limit },
    })
  );
});

module.exports = {
  getAllDocuments,
}