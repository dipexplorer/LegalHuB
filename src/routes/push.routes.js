// src/routes/push.routes.js
const express = require("express");
const router = express.Router();
const { webPush, enabled, publicKey } = require("../config/push");
const Subscription = require("../models/subscription.model");

router.get("/vapidPublicKey", (req, res) => {
    if (!enabled || !process.env.VAPID_PUBLIC_KEY)
        return res.status(500).json({ error: "VAPID key not configured" });
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// Subscribe to push notifications - requires authentication
router.post("/subscribe", async (req, res) => {
    try {
        const subscription = req.body;
        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ error: "Invalid subscription" });
        }

        const userId = req.user ? req.user._id : null;

        // Upsert by endpoint (works well for anonymous or authenticated)
        const updated = await Subscription.findOneAndUpdate(
            { endpoint: subscription.endpoint },
            { $set: { keys: subscription.keys, user: userId } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.status(200).json({ message: "Subscribed successfully", subscription: updated });
    } catch (error) {
        console.error("Error saving subscription:", error);
        res.status(500).json({ error: error.message || "Failed to save subscription" });
    }
});

// Unsubscribe from push notifications
router.post("/unsubscribe", async (req, res) => {
    try {
        const { endpoint } = req.body;
        if (!endpoint) return res.status(400).json({ error: "Endpoint is required" });

        const query = req.user ? { user: req.user._id, endpoint } : { endpoint };
        const deleted = await Subscription.findOneAndDelete(query);
        if (!deleted) return res.status(404).json({ error: "Subscription not found" });

        res.status(200).json({ message: "Unsubscribed successfully" });
    } catch (error) {
        console.error("Error removing subscription:", error);
        res.status(500).json({ error: "Failed to remove subscription" });
    }
});

// Send: accept { payload, userId } or no userId to send to all subscriptions
router.post("/send", async (req, res) => {
    if (!enabled) return res.status(500).json({ error: "Push not enabled on server" });

    const payload = JSON.stringify(
        req.body.payload || { title: "New Notification", body: "Open your dashboard", url: "/" }
    );
    const targetUserId = req.body.userId || null;

    let subs;
    try {
        subs = targetUserId
            ? await Subscription.find({ user: targetUserId })
            : await Subscription.find({});
    } catch (err) {
        return res.status(500).json({ error: "Failed to load subscriptions" });
    }

    // Consider batching or rate-limiting for many subs; using sequential here to simplify logs.
    const results = [];
    for (const subDoc of subs) {
        const sub = { endpoint: subDoc.endpoint, keys: subDoc.keys };
        try {
            await webPush.sendNotification(sub, payload);
            results.push({ id: subDoc._id, status: "ok" });
        } catch (err) {
            // If expired or gone -> delete
            if (err.statusCode === 410 || err.statusCode === 404 || /p256dh/.test(err.message)) {
                try {
                    await Subscription.deleteOne({ _id: subDoc._id });
                } catch (delErr) {
                    console.error("Failed to delete expired subscription:", delErr);
                }
            }
            console.error("Push send error:", err && err.message ? err.message : err);
            results.push({ id: subDoc._id, status: "failed", error: err.message || err });
        }
    }

    res.json({ results });
});

module.exports = router;
