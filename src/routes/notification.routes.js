const express = require("express");
const router = express.Router();
const {
    getUserNotifications,
    markAsRead,
    getAllNotifications,
} = require("../controllers/notification.controller.js");
const { isLoggedIn } = require("../middlewares/auth.middleware.js");

// User routes
router.get("/", isLoggedIn, getUserNotifications);
router.post("/:id/read", markAsRead);

// Admin routes
router.get("/all", isLoggedIn, getAllNotifications); // restrict inside controller/middleware

module.exports = router;
