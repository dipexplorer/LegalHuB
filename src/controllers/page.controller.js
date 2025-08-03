const Document = require("../models/document.model.js");
const Article = require("../models/article.model.js");
const Right = require("../models/rights.model.js");
const asyncHandler = require("../utils/asyncHandler.js");
const ApiError = require("../utils/apiError.js");
const ApiResponse = require("../utils/apiResponse.js");
const User = require("../models/user.model.js");

const renderHome = (req, res) => {
    res.render("pages/index");
};

const renderDictionary = (req, res) => {
    res.render("pages/dictionary");
};

const renderDocument = asyncHandler(async (req, res) => {
    // Extract filter parameters from query string
    const { search, state, department, sortBy } = req.query;
    
    // Build filter object
    let filter = {};
    
    // Add text search filter (case-insensitive search across title and description)
    if (search && search.trim()) {
        filter.$or = [
            { title: { $regex: search.trim(), $options: 'i' } },
            { description: { $regex: search.trim(), $options: 'i' } }
        ];
    }
    
    // Add state filter
    if (state && state !== 'all') {
        filter.state = state;
    }
    
    // Add department filter
    if (department && department !== 'all') {
        filter.department = department;
    }
    
    // Build sort object
    let sort = {};
    switch (sortBy) {
        case 'oldest':
            sort = { createdAt: 1 };
            break;
        case 'downloads':
            sort = { downloadCount: -1 };
            break;
        case 'alphabetical':
            sort = { title: 1 };
            break;
        case 'newest':
        default:
            sort = { createdAt: -1 };
            break;
    }
    
    // Fetch filtered and sorted documents
    const documents = await Document.find(filter).sort(sort);
    
    // Get unique states and departments for filter options
    const allStates = await Document.distinct('state');
    const allDepartments = await Document.distinct('department');
    
    // Prepare filter options
    const filterOptions = {
        states: allStates.sort(),
        departments: allDepartments.sort(),
        sortOptions: [
            { value: 'newest', label: 'Newest First' },
            { value: 'oldest', label: 'Oldest First' },
            { value: 'downloads', label: 'Most Downloaded' },
            { value: 'alphabetical', label: 'A-Z' }
        ]
    };
    
    // Current filter state for maintaining form values
    const currentFilters = {
        search: search || '',
        state: state || 'all',
        department: department || 'all',
        sortBy: sortBy || 'newest'
    };

    // ✅ Render with documents, filter options, and current filters
    res.render("pages/documents", { 
        documents, 
        filterOptions, 
        currentFilters,
        resultsCount: documents.length
    });
});

const renderArticles = asyncHandler(async (req, res) => {
    const articles = await Article.find()
        .populate("author", "name email")
        .sort({ createdAt: -1 });
    res.render("pages/articles", { articles });
});

const renderFundamental = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    // ✅ Total rights count karo
    const totalRights = await Right.countDocuments();

    // ✅ Rights ko paginate karo
    const rights = await Right.find().skip(skip).limit(limit);

    res.render("pages/fundamental", {
        rights,
        currentPage: page,
        totalPages: Math.ceil(totalRights / limit),
    });
});

const renderAbout = (req, res) => {
    res.render("pages/about");
};

const renderPrivacyPolicy = asyncHandler(async (req, res) => {
    res.render("pages/privacy");
});

const renderTermsAndConditions = asyncHandler(async (req, res) => {
    res.render("pages/terms");
});

const renderLoginForm = async (req, res) => {
    res.render("users/login");
};

const getLawyers = asyncHandler(async (req, res) => {
    const lawyers = await User.find({});
    res.render("pages/lawyers", { lawyers });
});

module.exports = {
    renderHome,
    renderDictionary,
    renderDocument,
    renderArticles,
    renderFundamental,
    renderPrivacyPolicy,
    renderTermsAndConditions,
    renderAbout,
    renderLoginForm,
    getLawyers,
};
