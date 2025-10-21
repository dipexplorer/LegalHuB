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
async function fetchAllPages(url, headers) {
    let allData = [];
    let nextUrl = url;
    while (nextUrl) {
        try {
            const response = await axios.get(nextUrl, { headers, params: { per_page: 100 } });
            if (response.data && Array.isArray(response.data)) {
                 allData = allData.concat(response.data);
            } else {
                nextUrl = null;
                continue;
            }
            const linkHeader = response.headers.link;
            if (linkHeader) {
                const nextMatch = linkHeader.match(/<([^>]+)>; rel="next"/);
                nextUrl = nextMatch ? nextMatch[1] : null;
            } else {
                nextUrl = null;
            }
        } catch (error) {
            console.error(`Error fetching GitHub page: ${nextUrl}`, error.message);
            nextUrl = null;
        }
    }
    return allData;
}

async function fetchContributors(owner, repo) {
    const url = `https://api.github.com/repos/${owner}/${repo}/contributors`;
    const headers = {};
    if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    const allContributors = await fetchAllPages(url, headers);
    const totalCommits = allContributors.reduce((sum, contributor) => {
        return sum + (contributor.contributions || 0);
    }, 0);
    return {
        contributorsList: allContributors,
        contributorsCount: allContributors.length,
        totalCommits: totalCommits
    };
}

async function fetchRepoStats(owner, repo) {
    const base = `https://api.github.com/repos/${owner}/${repo}`;
    const searchApi = `https://api.github.com/search/issues`;
    const headers = {};
    if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    const date = new Date();
    date.setDate(date.getDate() - 30);
    const thirtyDaysAgo = date.toISOString().split('T')[0];

    const [repoRes, prsRes, issuesRes] = await Promise.allSettled([
        axios.get(base, { headers }),
        axios.get(searchApi, { 
            headers, 
            params: { q: `repo:${owner}/${repo} is:pr is:merged` } 
        }),
        axios.get(searchApi, {
            headers,
            params: { q: `repo:${owner}/${repo} is:issue is:closed closed:>=${thirtyDaysAgo}` }
        })
    ]);

    const getData = (result, path, defaultValue = 0) => {
        if (result.status === 'fulfilled' && result.value.data) {
            return path.split('.').reduce((o, k) => (o || {})[k], result.value) || defaultValue;
        }
        if (result.status === 'rejected') {
            console.error(`API call failed. Reason:`, result.reason.message);
        }
        return defaultValue;
    };

    return {
        stars: getData(repoRes, 'data.stargazers_count', 0),
        forks: getData(repoRes, 'data.forks_count', 0),
        watchers: getData(repoRes, 'data.watchers_count', 0), // Added watchers
        openIssues: getData(repoRes, 'data.open_issues_count', 0), // Added openIssues
        repoHtmlUrl: getData(repoRes, 'data.html_url', '#'), // Added repoHtmlUrl
        pullsUrl: `${getData(repoRes, 'data.html_url', '#')}/pulls`, // Added pullsUrl
        issuesUrl: `${getData(repoRes, 'data.html_url', '#')}/issues`, // Added issuesUrl
        pulls: getData(prsRes, 'data.total_count', 0),
        issuesClosed: getData(issuesRes, 'data.total_count', 0)
    };
}

// REPLACE your old renderHome function with this new one

const renderHome = asyncHandler(async (req, res) => {
    const lawyersPromise = User.find({ role: "lawyer" }).limit(3);

    // --- ADD THIS LOGIC BACK ---
    const owner = process.env.REPO_OWNER || "dipexplorer";
    const repo = process.env.REPO_NAME || "LegalHuB";
    let contributorsTop = [];

    try {
        // We only need to fetch contributors for the slider, not the full stats
        const contributorData = await fetchContributors(owner, repo);
        contributorsTop = (contributorData.contributorsList || []).slice(0, 12); // Get top 12
    } catch (err) {
        console.error("Error fetching homepage contributors:", err.message);
        contributorsTop = []; // Fail silently if it breaks
    }
    // --- END OF ADDED LOGIC ---

    const lawyers = await lawyersPromise;
    
    // Pass the real contributorsTop data, not an empty array
    res.render("pages/index", { lawyers, contributorsTop, githubStats: null });
});

// ... (all other functions like renderDictionary, renderDocument, etc. stay the same) ...

const renderDictionary = (req, res) => {
    res.render("pages/dictionary");
};
const renderDocument = asyncHandler(async (req, res) => {
    const {
        search,
        state,
        department,
        sortBy,
        page = 1,
        limit = 6,
    } = req.query;
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
    const currentPage = Math.max(1, parseInt(page));
    const perPage = Math.max(1, parseInt(limit));
    const skip = (currentPage - 1) * perPage;
    const [documents, totalDocuments] = await Promise.all([
        Document.find(filter).sort(sort).skip(skip).limit(perPage),
        Document.countDocuments(filter),
    ]);
    const totalPages = Math.ceil(totalDocuments / perPage);
    const allStates = await Document.distinct("state");
    const allDepartments = await Document.distinct("department");
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
    const {
        search,
        category,
        articleNumber,
        page = 1,
        limit = 9,
    } = req.query;
    let filter = {};
    if (search && search.trim()) {
        const searchRegex = { $regex: search.trim(), $options: "i" };
        filter.$or = [
            { name: searchRegex },
            { description: searchRegex },
            { articleNumber: searchRegex },
        ];
    }
    if (category && category !== "all" && category.trim()) {
        filter.category = category.trim();
    }
    if (articleNumber && articleNumber.trim()) {
        filter.articleNumber = { $regex: articleNumber.trim(), $options: "i" };
    }
    const currentPage = Math.max(1, parseInt(page));
    const perPage = Math.max(1, parseInt(limit));
    const skip = (currentPage - 1) * perPage;
    const [rights, totalRights, categoryStats] = await Promise.all([
        Right.find(filter)
            .sort({ articleNumber: 1 })
            .skip(skip)
            .limit(perPage),
        Right.countDocuments(filter),
        Right.aggregate([
            { $group: { _id: "$category", count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]),
    ]);
    const totalPages = Math.ceil(totalRights / perPage);
    const allCategories = await Right.distinct("category");
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
    const currentFilters = {
        search: search || "",
        category: category || "all",
        articleNumber: articleNumber || "",
    };
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
        const username = (lawyer.username || "").toLowerCase();
        const spec = (lawyer.lawyerProfile.specialization || "").toLowerCase();
        const city = (lawyer.lawyerProfile.city || "").toLowerCase();
        const state = (lawyer.lawyerProfile.state || "").toLowerCase();
        if (
            specializationFilter &&
            specializationFilter !== "all" &&
            !spec.includes(specializationFilter)
        ) {
            return false;
        }
        if (locationFilter && locationFilter !== "all" && !city.includes(locationFilter)) {
            return false;
        }
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
const renderNotifications = asyncHandler(async (req, res) => {
    const notifications = await Notification.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(50);
    res.render("pages/notifications", { notifications });
});
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

// ---------- Contributors Page (THE FIX) ----------
const renderContributors = asyncHandler(async (req, res) => {
    const owner = process.env.REPO_OWNER || "dipexplorer";
    const repo = process.env.REPO_NAME || "LegalHuB";

    let contributors = [];
    let repoStats = {}; // Default to empty object

    try {
        // --- FIX: We now fetch ALL data here ---
        const [contributorResult, statsResult] = await Promise.allSettled([
            fetchContributors(owner, repo),
            fetchRepoStats(owner, repo),
        ]);
        
        if (statsResult.status === 'fulfilled') {
            repoStats = statsResult.value;
        } else {
            console.error("fetchRepoStats failed:", statsResult.reason);
            repoStats = { stars: 0, forks: 0, pulls: 0, issuesClosed: 0 }; // Default
        }
        
        if (contributorResult.status === 'fulfilled') {
            const contributorData = contributorResult.value;
            contributors = contributorData.contributorsList;
            
            // --- FIX: We add the contributor stats to the repoStats object ---
            repoStats.contributors = contributorData.contributorsCount;
            repoStats.commits = contributorData.totalCommits;
        } else {
            console.error("fetchContributors failed:", contributorResult.reason);
            contributors = [];
            repoStats.contributors = 0;
            repoStats.commits = 0;
        }
        
    } catch (err) {
        console.error("Error fetching contributors page data:", err.message);
        contributors = [];
        repoStats = null;
    }

    res.render("pages/contributors", {
        owner,
        repo,
        contributors,
        repoStats, // This object now contains ALL stats
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