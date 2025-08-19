const Document = require("../models/document.model.js");
const asyncHandler = require("../utils/asyncHandler.js");
const ApiError = require("../utils/apiError.js");
const ApiResponse = require("../utils/apiResponse.js");
const indianStates = require("../utils/indianStates.js");

// ✅ Create Document
const createDocument = asyncHandler(async (req, res) => {
    const {
        title,
        description,
        downloadLink,
        applyLink,
        state,
        department,
        guidelines,
        requiredDocuments,
    } = req.body;

    if (
        !title ||
        !description ||
        !downloadLink ||
        !applyLink ||
        !state ||
        !department ||
        !guidelines ||
        !requiredDocuments
    ) {
        throw new ApiError(400, "All fields are required");
    }

    // Check if state is a valid Indian state
    const normalizedState = state.trim();
    const matchedState = indianStates.find(
        (validState) => validState.toLowerCase() === normalizedState.toLowerCase()
    );

    if (!matchedState) {
        throw new ApiError(400, "Not a valid Indian state");
    }

    const document = await Document.create({
        title,
        description,
        downloadLink,
        applyLink,
        state: normalizedState,
        department,
        guidelines,
        requiredDocuments,
    });

    res.status(201).json(new ApiResponse(201, document, "Document created successfully"));
});

// ✅ Get All Documents with filtering support
const getAllDocuments = asyncHandler(async (req, res) => {
    // Extract filter parameters from query string
    const { search, state, department, sortBy, page = 1, limit = 10 } = req.query;

    // Build filter object
    let filter = {};

    // Add text search filter (case-insensitive search across title and description)
    if (search && search.trim()) {
        filter.$or = [
            { title: { $regex: search.trim(), $options: "i" } },
            { description: { $regex: search.trim(), $options: "i" } },
        ];
    }

    // Add state filter
    if (state && state !== "all") {
        const matchedState = indianStates.find(
            (s) => s.toLowerCase() === state.trim().toLowerCase()
        );
        if (matchedState) {
            filter.state = matchedState;
        }
    }

    // Add department filter
    if (department && department !== "all") {
        filter.department = department;
    }

    // Build sort object
    let sort = {};
    switch (sortBy) {
        case "oldest":
            sort = { createdAt: 1 };
            break;
        case "downloads":
            sort = { downloadCount: -1 };
            break;
        case "alphabetical":
            sort = { title: 1 };
            break;
        case "newest":
        default:
            sort = { createdAt: -1 };
            break;
    }

    // Calculate pagination
    const safePage = Number.isNaN(parseInt(page)) ? 1 : parseInt(page);
    const safeLimit = Number.isNaN(parseInt(limit)) ? 10 : parseInt(limit);
    const skip = (safePage - 1) * safeLimit;

    // Fetch filtered and sorted documents with pagination
    const documents = await Document.find(filter).sort(sort).skip(skip).limit(safeLimit);

    // Get total count for pagination
    const totalDocuments = await Document.countDocuments(filter);

    // Get filter options
    const allStates = await Document.distinct("state");
    const allDepartments = await Document.distinct("department");

    const responseData = {
        documents,
        pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalDocuments / parseInt(limit)),
            totalDocuments,
            hasNextPage: parseInt(page) < Math.ceil(totalDocuments / parseInt(limit)),
            hasPrevPage: parseInt(page) > 1,
        },
        filterOptions: {
            states: allStates.sort(),
            departments: allDepartments.sort(),
        },
        appliedFilters: {
            search: search || "",
            state: state || "all",
            department: department || "all",
            sortBy: sortBy || "newest",
        },
    };

    res.status(200).json(new ApiResponse(200, responseData, "Documents fetched successfully"));
});

// ✅ Get Document by ID
const getDocumentById = asyncHandler(async (req, res) => {
    const document = await Document.findById(req.params.id);

    if (!document) {
        throw new ApiError(404, "Document not found");
    }
    // res.render('pages/documentDetails', { document })
    if (req.accepts("html")) {
        res.render("pages/documentDetails", { document });
    } else {
        res.status(200).json(new ApiResponse(200, document, "Document fetched successfully"));
    }
});

// ✅ Update Document
const updateDocument = asyncHandler(async (req, res) => {
    const {
        title,
        description,
        downloadLink,
        applyLink,
        state,
        department,
        guidelines,
        requiredDocuments,
    } = req.body;

    const document = await Document.findById(req.params.id);
    if (!document) {
        throw new ApiError(404, "Document not found");
    }

    // If state is provided, validate it
    let validatedState = state;
    if (state) {
        const normalizedState = state.trim();
        const matchedState = indianStates.find(
            (validState) => validState.toLowerCase() === normalizedState.toLowerCase()
        );

        if (!matchedState) {
            throw new ApiError(400, "Not a valid Indian state");
        }

        validatedState = matchedState; // Use the matched one for consistency
    }

    document.title = title || document.title;
    document.description = description || document.description;
    document.downloadLink = downloadLink || document.downloadLink;
    document.applyLink = applyLink || document.applyLink;
    document.state = validatedState || document.state;
    document.department = department || document.department;
    document.guidelines = guidelines || document.guidelines;
    document.requiredDocuments = requiredDocuments || document.requiredDocuments;

    await document.save();

    res.status(200).json(new ApiResponse(200, document, "Document updated successfully"));
});

// ✅ Delete Document
const deleteDocument = asyncHandler(async (req, res) => {
    const document = await Document.findById(req.params.id);
    if (!document) {
        throw new ApiError(404, "Document not found");
    }

    await document.deleteOne();

    res.status(200).json(new ApiResponse(200, null, "Document deleted successfully"));
});

// ✅ Download Document
const downloadDocument = asyncHandler(async (req, res) => {
    const document = await Document.findById(req.params.id);
    if (!document) {
        throw new ApiError(404, "Document not found");
    }
    res.redirect(document.downloadLink); // Direct download ke liye redirect kar diya
});

// ✅ Apply Online Link
const applyOnline = asyncHandler(async (req, res) => {
    const document = await Document.findById(req.params.id);
    if (!document) {
        throw new ApiError(404, "Document not found");
    }
    res.redirect(document.applyLink);
});

// Route to track downloads
const trackDownload = asyncHandler(async (req, res) => {
    const document = await Document.findById(req.params.id);
    if (!document) {
        throw new ApiError(404, "Document not found");
    }
    document.downloadCount = (document.downloadCount || 0) + 1; // Increment download count

    // If user is logged in, store username
    if (req.user) {
        document.downloadedBy.push({ username: req.user.username });
    } else {
        req.flash("error", "You need to log in to store download info.");
    }

    await document.save();
    res.status(200).json(new ApiResponse(200, document, "Download tracked successfully"));
});

const renderDownCount = asyncHandler(async (req, res) => {
    const documents = await Document.find();
    res.render("pages/down_doc", { documents });
});

module.exports = {
    createDocument,
    getAllDocuments,
    getDocumentById,
    updateDocument,
    deleteDocument,
    downloadDocument,
    applyOnline,
    trackDownload,
    renderDownCount,
};
