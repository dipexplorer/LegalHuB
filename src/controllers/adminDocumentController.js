const Document = require("../models/document.model.js");
const asyncHandler = require("../utils/asyncHandler.js");
const apiResponse = require("../utils/apiResponse.js");
const apiError = require("../utils/apiError.js");
const indianStates = require("../utils/indianStates.js");
const { Parser } = require("json2csv");

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
        case "title_asc":
            sortOptions = { title: 1 };
            break;
        case "title_desc":
            sortOptions = { title: -1 };
            break;
        case "downloads_desc":
            sortOptions = { downloadCount: -1 };
            break;
        case "downloads_asc":
            sortOptions = { downloadCount: 1 };
            break;
        case "updated_desc":
            sortOptions = { updatedAt: -1 };
            break;
        case "updated_asc":
            sortOptions = { updatedAt: 1 };
            break;
        default:
            sortOptions = { createdAt: -1 };
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

// GET /api/admin/dashboard/documents/export-csv
const exportCsv = asyncHandler(async (req, res) => {
    const { q, state, dept, sort } = req.query;

    // 🔎 Filters
    const filter = {};
    if (q) {
        filter.$or = [
            { title: new RegExp(q, "i") },
            { description: new RegExp(q, "i") },
            { department: new RegExp(q, "i") },
        ];
    }
    if (state) filter.state = state;
    if (dept) filter.department = dept;

    // ↕ Sorting
    let sortObj = { createdAt: -1 };
    if (sort) {
        const [field, dir] = sort.split("_");
        sortObj = { [field]: dir === "asc" ? 1 : -1 };
    }

    // 📄 Query (no pagination, export everything that matches)
    const docs = await Document.find(filter).sort(sortObj).lean();

    // 📝 CSV fields
    const fields = [
        { label: "Title", value: "title" },
        { label: "Department", value: "department" },
        { label: "State", value: "state" },
        { label: "Description", value: "description" },
        { label: "Downloads", value: (row) => row.downloadCount || 0 },
        {
            label: "Created",
            value: (row) => (row.createdAt ? new Date(row.createdAt).toISOString() : ""),
        },
        {
            label: "Updated",
            value: (row) => (row.updatedAt ? new Date(row.updatedAt).toISOString() : ""),
        },
        { label: "Guidelines", value: (row) => (row.guidelines || []).join("; ") },
        { label: "Required Documents", value: (row) => (row.requiredDocuments || []).join("; ") },
        { label: "Download Link", value: "downloadLink" },
        { label: "Apply Link", value: "applyLink" },
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(docs);

    // ⬇ Send as file
    res.header("Content-Type", "text/csv");
    res.attachment("documents-export.csv");
    res.send(csv);
});

module.exports = {
    getAllDocuments,
    exportCsv,
};
