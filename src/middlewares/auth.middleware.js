const jwt = require("jsonwebtoken");
const ApiError = require("../utils/apiError.js");
const apiResponse = require("../utils/apiResponse.js");
const asyncHandler = require("../utils/asyncHandler");
const ChatRoom = require("../models/chatRoom.model.js");

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
    const adminSecret = req.headers["ADMIN_SECRECT_KEY"]; // Typo matches .env

    if (!adminSecret || adminSecret !== process.env.ADMIN_SECRECT_KEY) {
        return res.status(403).json({ error: "Forbidden: Invalid admin secret" });
    }

    next(); // ✅ If secret is correct, proceed to the route
};

const saveRedirectUrl = (req, res, next) => {
    if (req.session.redirectUrl) {
        res.locals.redirectUrl = req.session.redirectUrl;
    }
    next();
};

const requireRole = (role) => {
    return asyncHandler(async (req, res, next) => {
        if (!req.user) {
            return next(new ApiError(401, "Unauthorized"));
        }
        if (req.user.role === role || req.user.role === "admin") {
            return next();
        }
        return next(new ApiError(403, "Forbidden"));
    });
};

const ownChatRoom = asyncHandler(async (req, res, next) => {
    const userId = req.user._id;
    const chatRoomId = req.params.chatRoomId || req.body.chatRoomId;

    if (!chatRoomId) {
        throw new ApiError(400, "Chat room ID is required");
    }

    const chatRoom = await ChatRoom.findById(chatRoomId);
    if (!chatRoom) {
        throw new ApiError(404, "Chat room not found");
    }

    const isParticipant = chatRoom.participants.some((p) => p.toString() === userId.toString());
    if (!isParticipant) {
        throw new ApiError(403, "You do not have access to this chat room");
    }

    req.chatRoom = chatRoom; // store for later use in controllers
    next();
});

module.exports = {
    isLoggedIn,
    isAdmin,
    saveRedirectUrl,
    requireRole,
    ownChatRoom,
};