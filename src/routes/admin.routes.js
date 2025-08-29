const express = require("express");
const router = express.Router();
const { isAdmin } = require("../middlewares/auth.middleware.js");
const { dashboardStats, toggleLawyerApprove } = require("../controllers/adminDashboard.js");
const {
    renderUserPage,
    toggleUserStatus,
    changeUserRole,
} = require("../controllers/adminUserController.js");
const {
    getAllLawyers,
    toggleLawyerStatus,
    deleteLawyer,
} = require("../controllers/adminLawyerController.js");
const { getAllArticles, deleteArticle } = require("../controllers/adminArticleController.js");
const { getAllDocuments, exportCsv } = require("../controllers/adminDocumentController.js");

// render pages
router.route("/dashboard/users").get(isAdmin, renderUserPage);

// user routes
router.route("/dashboard/users/toggle-status/:id").post(isAdmin, toggleUserStatus);
router.route("/dashboard/users/change-role/:id").post(isAdmin, changeUserRole);

// lawyer routes
router.route("/dashboard/lawyers").get(isAdmin, getAllLawyers);
router.route("/dashboard/lawyers/verify/:id").post(isAdmin, toggleLawyerApprove);
router.route("/dashboard/lawyers/toggle-status/:id").post(isAdmin, toggleLawyerStatus);
router.route("/dashboard/lawyers/delete/:id").post(isAdmin, deleteLawyer);

// article routes
router.route("/dashboard/articles").get(isAdmin, getAllArticles);
router.route("/dashboard/articles/delete/:id").post(isAdmin, deleteArticle);

// document routes
router.route("/dashboard/documents").get(isAdmin, getAllDocuments);
router.route("/dashboard/documents/export-csv").get(isAdmin, exportCsv);

router.route("/dashboard").get(isAdmin, dashboardStats);

module.exports = router;
