const User = require("../models/user.model.js");
const LawyerProfile = require("../models/lawyer.model.js");
const Right = require("../models/rights.model.js");
const Document = require("../models/document.model.js");
const Article = require("../models/article.model.js");
const asyncHandler = require("../utils/asyncHandler.js");
const apiResponse = require("../utils/apiResponse.js");
const apiError = require("../utils/apiError.js");
const Appointment = require("../models/appointment.model.js");

// --- Dashboard stats
const dashboardStats = asyncHandler(async (req, res) => {
    const totalUsers = await User.countDocuments({ role: "user" });
    const totalVerifiedLawyers = await LawyerProfile.countDocuments({ isVerified: true });
    const pendingLawyers = await LawyerProfile.countDocuments({ isVerified: false });

    const totalArticles = await Article.countDocuments();
    const totalDocuments = await Document.countDocuments();
    const totalRights = await Right.countDocuments();

    // Appointments stats
    const totalAppointments = await Appointment.countDocuments();
    const pendingAppointments = await Appointment.countDocuments({ status: "pending" });
    const approvedAppointments = await Appointment.countDocuments({ status: "approved" });
    const completedAppointments = await Appointment.countDocuments({ status: "completed" });

    // ✅ Fetch latest 10 appointments
    const appointments = await Appointment.find()
        .populate("client", "username email")
        .populate("lawyer", "username email")
        .limit(10)
        .sort({ createdAt: -1 });

    // Lawyers for table
    const lawyers = await LawyerProfile.find()
        .populate("user", "username email role")
        .limit(50)
        .sort({ createdAt: -1 });

    res.render("admin/dashboard", {
        totalUsers,
        totalVerifiedLawyers,
        pendingLawyers,
        totalArticles,
        totalDocuments,
        totalRights,
        totalAppointments,
        pendingAppointments,
        approvedAppointments,
        completedAppointments,
        lawyers,
        appointments, // ✅ pass it to EJS
    });
});

// Admin approves lawyer application
const toggleLawyerApprove = asyncHandler(async (req, res) => {
    const lawyer = await LawyerProfile.findById(req.params.id);
    if (!lawyer) {
        return res.status(404).json(new apiError(404, "Lawyer not found"));
    }
    lawyer.isVerified = !lawyer.isVerified;
    await lawyer.save();

    if (req.accepts("html")) {
        req.flash("success", "Lawyer approved successfully");
        return res.redirect("/api/admin/dashboard");
    }
    res.status(200).json(new apiResponse(200, lawyer, "Lawyer approved successfully"));
});

module.exports = {
    dashboardStats,
    toggleLawyerApprove,
};
