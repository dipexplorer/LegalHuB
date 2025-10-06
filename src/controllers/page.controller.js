const Document = require("../models/document.model.js");
const Article = require("../models/article.model.js");
const Right = require("../models/rights.model.js");
const asyncHandler = require("../utils/asyncHandler.js");
const ApiError = require("../utils/apiError.js");
const ApiResponse = require("../utils/apiResponse.js");
const User = require("../models/user.model.js");
const LawyerProfile = require("../models/lawyer.model.js");
const Notification = require("../models/notification.model.js");
const axios = require("axios");

// ---------- GitHub Helpers ----------
async function fetchContributors(owner, repo) {
    const url = `https://api.github.com/repos/${owner}/${repo}/contributors`;
    const headers = {};
    if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    const { data } = await axios.get(url, { headers, params: { per_page: 100 } });
    return data;
}

async function fetchRepoStats(owner, repo) {
    const base = `https://api.github.com/repos/${owner}/${repo}`;
    const headers = {};
    if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    const [repoRes, prsRes, issuesRes] = await Promise.all([
        axios.get(base, { headers }),
        axios.get(`${base}/pulls`, { headers, params: { state: "closed", per_page: 1 } }),
        axios.get(`${base}/issues`, { headers, params: { state: "open", per_page: 1 } }),
    ]);

    return {
        stars: repoRes.data.stargazers_count,
        forks: repoRes.data.forks_count,
        watchers: repoRes.data.watchers_count,
        openIssues: repoRes.data.open_issues_count,
        defaultBranch: repoRes.data.default_branch,
        // lightweight counts; detailed counts would need pagination
        // expose links for users to explore
        repoHtmlUrl: repoRes.data.html_url,
        pullsUrl: `${repoRes.data.html_url}/pulls`,
        issuesUrl: `${repoRes.data.html_url}/issues`,
    };
}

const renderHome = asyncHandler(async (req, res) => {
    const lawyersPromise = User.find({ role: "lawyer" })
        .populate({
            path: "lawyerProfile",
            model: LawyerProfile,
            select: "specialization experience city state fees isVerified",
        })
        .limit(3);

    const owner = process.env.REPO_OWNER || "dipexplorer";
    const repo = process.env.REPO_NAME || "LegalHuB";

    let contributorsTop = [];
    try {
        const all = await fetchContributors(owner, repo);
        contributorsTop = (all || []).slice(0, 12);
    } catch (_) {
        contributorsTop = [];
    }

    const lawyers = await lawyersPromise;

    res.render("pages/index", { lawyers, contributorsTop });
});

const renderDictionary = (req, res) => {
    res.render("pages/dictionary");
};

const renderDocument = asyncHandler(async (req, res) => {
    // Extract filter parameters and pagination from query string
    const {
        search,
        state,
        department,
        sortBy,
        page = 1,
        limit = 6, // Feel free to adjust
    } = req.query;

    // Build filter object
    let filter = {};

    if (search && search.trim()) {
        filter.$or = [
            { title: { $regex: search.trim(), $options: "i" } },
            { description: { $regex: search.trim(), $options: "i" } },
        ];
    }

    if (state && state !== "all") {
        filter.state = state;
    }

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

    // Pagination logic
    const currentPage = Math.max(1, parseInt(page));
    const perPage = Math.max(1, parseInt(limit));
    const skip = (currentPage - 1) * perPage;

    const [documents, totalDocuments] = await Promise.all([
        Document.find(filter).sort(sort).skip(skip).limit(perPage),
        Document.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalDocuments / perPage);

    // Get unique states and departments
    const allStates = await Document.distinct("state");
    const allDepartments = await Document.distinct("department");

    // Filter and sort options for the frontend
    const filterOptions = {
        states: allStates.sort(),
        departments: allDepartments.sort(),
        sortOptions: [
            { value: "newest", label: "Newest First" },
            { value: "oldest", label: "Oldest First" },
            { value: "downloads", label: "Most Downloaded" },
            { value: "alphabetical", label: "A-Z" },
        ],
    };

    // Current filters for form pre-fill
    const currentFilters = {
        search: search || "",
        state: state || "all",
        department: department || "all",
        sortBy: sortBy || "newest",
    };

    res.render("pages/documents", {
        documents,
        filterOptions,
        currentFilters,
        resultsCount: documents.length,
        currentPage,
        totalPages,
        totalDocuments,
        request: req,
    });
});

const renderArticles = asyncHandler(async (req, res) => {
    const articles = await Article.find().populate("author", "name email").sort({ createdAt: -1 });
    res.render("pages/articles", { articles });
});

const renderFundamental = asyncHandler(async (req, res) => {
    // Extract search and filter parameters from query string
    const {
        search,
        category,
        articleNumber,
        page = 1,
        limit = 9, // Increased for better grid display
    } = req.query;

    // Build filter object for smart search
    let filter = {};

    // Smart search across multiple fields
    if (search && search.trim()) {
        const searchRegex = { $regex: search.trim(), $options: "i" };
        filter.$or = [
            { name: searchRegex },
            { description: searchRegex },
            { articleNumber: searchRegex },
        ];
    }

    // Category filtering
    if (category && category !== "all" && category.trim()) {
        filter.category = category.trim();
    }

    // Article number quick search (exact or partial match)
    if (articleNumber && articleNumber.trim()) {
        filter.articleNumber = { $regex: articleNumber.trim(), $options: "i" };
    }

    // Pagination logic
    const currentPage = Math.max(1, parseInt(page));
    const perPage = Math.max(1, parseInt(limit));
    const skip = (currentPage - 1) * perPage;

    // Execute queries in parallel for better performance
    const [rights, totalRights, categoryStats] = await Promise.all([
        Right.find(filter)
            .sort({ articleNumber: 1 }) // Sort by article number for logical order
            .skip(skip)
            .limit(perPage),
        Right.countDocuments(filter),
        Right.aggregate([
            { $group: { _id: "$category", count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]),
    ]);

    const totalPages = Math.ceil(totalRights / perPage);

    // Get all unique categories for filter dropdown
    const allCategories = await Right.distinct("category");

    // Prepare filter options with counts
    const filterOptions = {
        categories: allCategories.sort().map((cat) => {
            const stat = categoryStats.find((s) => s._id === cat);
            return {
                value: cat,
                label: cat,
                count: stat ? stat.count : 0,
            };
        }),
    };

    // Current filters for form pre-fill and active filter display
    const currentFilters = {
        search: search || "",
        category: category || "all",
        articleNumber: articleNumber || "",
    };

    // Calculate statistics for header display
    const stats = {
        totalRights: await Right.countDocuments(),
        totalCategories: allCategories.length,
        filteredResults: totalRights,
    };

    res.render("pages/fundamental", {
        rights,
        filterOptions,
        currentFilters,
        stats,
        resultsCount: rights.length,
        currentPage,
        totalPages,
        totalRights: totalRights,
        hasFilters: !!(search || (category && category !== "all") || articleNumber),
        request: req,
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
    const { search, specialization, location } = req.query;

    const specializations = await LawyerProfile.distinct("specialization");
    const locations = await LawyerProfile.distinct("city");

    let lawyers = await User.find({ role: "lawyer" })
        .populate({
            path: "lawyerProfile",
            model: LawyerProfile,
            select: "specialization experience city state availableSlots fees isVerified",
        })
        .lean();

    const filteredLawyers = lawyers.filter((lawyer) => {
        if (!lawyer.lawyerProfile) return false;

        const s = search && search.trim().toLowerCase();
        const specializationFilter = specialization && specialization.toLowerCase();
        const locationFilter = location && location.toLowerCase();

        // Normalize fields for comparisons (lowercase or empty string)
        const username = (lawyer.username || "").toLowerCase();
        const spec = (lawyer.lawyerProfile.specialization || "").toLowerCase();
        const city = (lawyer.lawyerProfile.city || "").toLowerCase();
        const state = (lawyer.lawyerProfile.state || "").toLowerCase();

        // Filter specialization if filter active
        if (
            specializationFilter &&
            specializationFilter !== "all" &&
            !spec.includes(specializationFilter)
        ) {
            return false;
        }

        // Filter location if filter active
        if (locationFilter && locationFilter !== "all" && !city.includes(locationFilter)) {
            return false;
        }

        // Search filter on username, specialization, city, state (partial)
        if (s) {
            if (
                !(username.includes(s) || spec.includes(s) || city.includes(s) || state.includes(s))
            ) {
                return false;
            }
        }

        return true;
    });

    res.render("pages/lawyers", {
        lawyers: filteredLawyers,
        search: search || "",
        specialization: specialization || "all",
        location: location || "all",
        specializations,
        locations,
    });
});

// Render notifications page
const renderNotifications = asyncHandler(async (req, res) => {
    const notifications = await Notification.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(50);

    res.render("pages/notifications", { notifications });
});

// Mark as read (from UI form)
const markAsRead = asyncHandler(async (req, res) => {
    await Notification.findOneAndUpdate(
        { _id: req.params.id, user: req.user._id },
        { status: "read" }
    );
    res.redirect("/notifications");
});

const renderSettings = asyncHandler(async (req, res) => {
    const user = req.user;
    res.render("pages/settings", { user });
});

// ---------- Contributors Page ----------
const renderContributors = asyncHandler(async (req, res) => {
    const owner = process.env.REPO_OWNER || "dipexplorer";
    const repo = process.env.REPO_NAME || "LegalHuB";

    let contributors = [];
    let repoStats = null;
    try {
        [contributors, repoStats] = await Promise.all([
            fetchContributors(owner, repo),
            fetchRepoStats(owner, repo),
        ]);
    } catch (err) {
        // fail-soft; still render page
        contributors = [];
        repoStats = null;
    }

    res.render("pages/contributors", {
        owner,
        repo,
        contributors,
        repoStats,
    });
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
    renderNotifications,
    markAsRead,
    renderSettings,
    renderContributors,
};
