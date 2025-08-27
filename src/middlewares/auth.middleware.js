const jwt = require("jsonwebtoken");
const ApiError = require("../utils/apiError.js");
const apiResponse = require("../utils/apiResponse.js");
const asyncHandler = require("../utils/asyncHandler");
const ChatRoom = require("../models/chatRoom.model.js");

const isLoggedIn = (req, res, next) => {
// Test bypass
if (process.env.NODE_ENV === "test" && req.body.author) {
req.user = { _id: req.body.author };
return next();
}

if (!req.isAuthenticated || !req.isAuthenticated()) {
if (req.flash) req.flash("error", "Please log in first");
return res.redirect("/login");
}

return next();
};

const isAdmin = (req, res, next) => {
const adminSecret = req.headers["ADMIN_SECRECT_KEY"]; // matches .env typo
if (!adminSecret || adminSecret !== process.env.ADMIN_SECRECT_KEY) {
return res.status(403).json({ error: "Forbidden: Invalid admin secret" });
}
return next();
};

const saveRedirectUrl = (req, res, next) => {
if (req.session && req.session.redirectUrl) {
res.locals.redirectUrl = req.session.redirectUrl;
}
return next();
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

const isParticipant = chatRoom.participants.some(
(p) => p.toString() === userId.toString()
);
if (!isParticipant) {
throw new ApiError(403, "You do not have access to this chat room");
}

req.chatRoom = chatRoom;
return next();
});

module.exports = {
isLoggedIn,
isAdmin,
saveRedirectUrl,
requireRole,
ownChatRoom,
};