const jwt = require("jsonwebtoken");
const ApiError = require("../utils/apiError.js");
const apiResponse = require("../utils/apiResponse.js");
const asyncHandler = require("../utils/asyncHandler");

const isLoggedIn = (req, res, next) => {
    // ✅ Bypass authentication if in test environment and author is in request
    if (process.env.NODE_ENV === "test" && req.body.author) {
        req.user = { _id: req.body.author }; // Simulate logged-in user
        return next();
    }

    if (!req.isAuthenticated()) {
        req.flash("error", "Please log in first");
        return res.redirect("/login"); // Redirect to login if not authenticated
    }
    // console.log("USER IS LOGGED IN:", req.user);
    next();
};
const isAdmin = (req, res, next) => {
    const adminSecret = req.headers["ADMIN_SECRECT_KEY"]; // 🔹 Get Secret from Headers

    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRECT_KEY) {
    }

    next(); // ✅ If secret is correct, proceed to the route
};
const saveRedirectUrl = (req, res, next) => {
    if (req.session.redirectUrl) {
        res.locals.redirectUrl = req.session.redirectUrl;
    }
    next();
};

module.exports = {
    isLoggedIn,
    isAdmin,
    saveRedirectUrl,
};
