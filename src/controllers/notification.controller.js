const Notification = require("../models/notification.model.js");
const asyncHandler = require("../utils/asyncHandler.js");
const apiError = require("../utils/apiError.js");
const apiResponse = require("../utils/apiResponse.js");
const mongoose = require("mongoose");

// Fetch current user's notifications
const getUserNotifications = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, status } = req.query;

    const query = { user: req.user._id };

    if (status) query.status = status; // e.g., unread only

    const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)); // Pagination

    const total = await Notification.countDocuments(query);

    if (req.accepts("html")) {
        //redirect to notifications page
        return res.redirect("/notifications");
    }
    res.status(200).json(new apiResponse(200, { notifications, total }, "Notifications fetched"));
});

// Mark a notification as read
const markAsRead = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) {
        return res.status(404).json({ success: false, message: "Notification not found" });
    }

    // short-circuit if already read
    if (notification.status === "read") {
        if (req.accepts("html")) {
            //redirect to notifications page
            return res.redirect("/notifications");
        }
        return res
            .status(200)
            .json({ success: true, message: "Already marked as read", data: notification });
    }

    // mark and save (runs validation, middleware, updates timestamps)
    notification.status = "read";
    await notification.save();

    if (req.accepts("html")) {
        //redirect to notifications page
        return res.redirect("/notifications");
    }
    res.status(200).json({
        success: true,
        message: "Notification marked as read",
        data: notification,
    });
});

// Admin: fetch all notifications
const getAllNotifications = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status, type } = req.query;

    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const notifications = await Notification.find(query)
        .populate("user", "username email role") // show recipient info
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);

    res.status(200).json(
        new apiResponse(200, { notifications, total }, "All notifications fetched (admin)")
    );
});

module.exports = {
    getUserNotifications,
    markAsRead,
    getAllNotifications,
};
