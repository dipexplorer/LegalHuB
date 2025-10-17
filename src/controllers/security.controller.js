const User = require("../models/user.model");
const LoginActivity = require("../models/loginActivity.model");
const SecuritySettings = require("../models/securitySettings.model");
const asyncHandler = require("../utils/asyncHandler");
const apiResponse = require("../utils/apiResponse");
const apiError = require("../utils/apiError");
const validatePassword = require("../validators/passwordValidator");
const useragent = require("express-useragent");
const geoip = require("geoip-lite");

// Render security page
const renderSecurityPage = asyncHandler(async (req, res) => {
    if (!req.user) {
        return res.redirect("/login");
    }

    // Get user's security settings
    let securitySettings = await SecuritySettings.findOne({ user: req.user._id });
    if (!securitySettings) {
        securitySettings = await SecuritySettings.create({ user: req.user._id });
    }

    // Get recent login activity
    const recentActivity = await LoginActivity.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(10);

    // Get active sessions from the session store
    const activeSessions = [];
    if (req.sessionStore) {
        await new Promise((resolve) => {
            req.sessionStore.all((error, sessions) => {
                if (sessions) {
                    sessions.forEach((session) => {
                        if (session.passport && session.passport.user === req.user.id) {
                            activeSessions.push({
                                id: session.id,
                                lastActive: new Date(session.cookie.expires),
                                current: session.id === req.sessionID
                            });
                        }
                    });
                }
                resolve();
            });
        });
    }

    res.render("pages/security", {
        user: req.user,
        securitySettings,
        recentActivity,
        activeSessions
    });
});

// Update security settings
const updateSecuritySettings = asyncHandler(async (req, res) => {
    const { notifications, recoveryEmail, recoveryPhone } = req.body;
    
    const settings = await SecuritySettings.findOneAndUpdate(
        { user: req.user._id },
        {
            notifications,
            recoveryEmail,
            recoveryPhone
        },
        { new: true, upsert: true }
    );

    if (req.accepts("html")) {
        req.flash("success", "Security settings updated successfully");
        return res.redirect("/account/security");
    }
    
    return res.status(200).json(
        new apiResponse(200, settings, "Security settings updated successfully")
    );
});

// Change password with current password verification
const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Verify passwords match
    if (newPassword !== confirmPassword) {
        if (req.accepts("html")) {
            req.flash("error", "New passwords do not match");
            return res.redirect("/account/security");
        }
        throw new apiError(400, "New passwords do not match");
    }

    // Validate password strength
    const strength = validatePassword(newPassword);
    if (strength.errors.length > 0) {
        if (req.accepts("html")) {
            req.flash("error", strength.errors.join(" "));
            return res.redirect("/account/security");
        }
        throw new apiError(400, strength.errors.join(" "));
    }

    // Verify current password and change to new password
    const user = await User.findById(req.user._id);
    try {
        await user.changePassword(currentPassword, newPassword);
    } catch (error) {
        if (req.accepts("html")) {
            req.flash("error", "Current password is incorrect");
            return res.redirect("/account/security");
        }
        throw new apiError(400, "Current password is incorrect");
    }

    // Update last password change date
    await SecuritySettings.findOneAndUpdate(
        { user: req.user._id },
        { lastPasswordChange: Date.now() }
    );

    if (req.accepts("html")) {
        req.flash("success", "Password changed successfully");
        return res.redirect("/account/security");
    }

    return res.status(200).json(
        new apiResponse(200, null, "Password changed successfully")
    );
});

// Log out from other sessions
const logoutOtherSessions = asyncHandler(async (req, res) => {
    if (req.sessionStore) {
        await new Promise((resolve) => {
            req.sessionStore.all((error, sessions) => {
                if (sessions) {
                    sessions.forEach((session) => {
                        if (
                            session.passport &&
                            session.passport.user === req.user.id &&
                            session.id !== req.sessionID
                        ) {
                            req.sessionStore.destroy(session.id);
                        }
                    });
                }
                resolve();
            });
        });
    }

    if (req.accepts("html")) {
        req.flash("success", "Successfully logged out from other sessions");
        return res.redirect("/account/security");
    }

    return res.status(200).json(
        new apiResponse(200, null, "Successfully logged out from other sessions")
    );
});

// Log out specific session
const logoutSession = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;

    if (req.sessionStore) {
        await new Promise((resolve) => {
            req.sessionStore.destroy(sessionId, () => resolve());
        });
    }

    if (req.accepts("html")) {
        req.flash("success", "Session terminated successfully");
        return res.redirect("/account/security");
    }

    return res.status(200).json(
        new apiResponse(200, null, "Session terminated successfully")
    );
});

// Track login activity middleware
const trackLoginActivity = asyncHandler(async (req, res, next) => {
    const ua = useragent.parse(req.headers["user-agent"]);
    const ip = req.ip || req.connection.remoteAddress;
    const geo = geoip.lookup(ip);
    
    await LoginActivity.create({
        user: req.user._id,
        device: ua.platform,
        browser: ua.browser,
        ip: ip,
        location: geo ? `${geo.city}, ${geo.country}` : "Unknown",
        sessionId: req.sessionID,
    });

    next();
});

module.exports = {
    renderSecurityPage,
    updateSecuritySettings,
    changePassword,
    logoutOtherSessions,
    logoutSession,
    trackLoginActivity,
};