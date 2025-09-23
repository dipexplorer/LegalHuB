const express = require("express");
const router = express.Router();
const {
    renderHome,
    renderDictionary,
    renderDocument,
    renderArticles,
    renderFundamental,
    renderAbout,
    renderPrivacyPolicy,
    renderTermsAndConditions,
    renderLoginForm,
    getLawyers,
    renderNotifications,
    markAsRead,
    renderSettings,
} = require("../controllers/page.controller.js");

const { viewLawyer } = require("../controllers/lawyer.controller.js");
const {
    getUserProfile,
    renderUpdateForm,
    renderLawyerUpdateForm,
    renderLawyerApplyForm,
} = require("../controllers/user.controller.js");
const { publishArticle, renderEditForm } = require("../controllers/article.controller.js");
const { renderDownCount } = require("../controllers/document.controller.js");
const { isLoggedIn } = require("../middlewares/auth.middleware.js");

router.get("/", renderHome);
router.get("/dictionary", renderDictionary);
router.get("/documents", renderDocument);
router.get("/articles", renderArticles);
router.get("/rights", renderFundamental);
router.get("/lawyers", getLawyers);
router.get("/lawyers/:id", viewLawyer);
router.get("/about", renderAbout);
router.get("/privacy", renderPrivacyPolicy);
router.get("/terms", renderTermsAndConditions);
router.get("/login", renderLoginForm);
router.get("/account", getUserProfile);
router.get("/account/update", renderUpdateForm);
router.get("/account/applyforlawyer", renderLawyerApplyForm);
router.get("/account/update/lawyer", renderLawyerUpdateForm);
router.get("/articles/publish", isLoggedIn, publishArticle);
router.get("/articles/:id/edit", isLoggedIn, renderEditForm);
router.get("/viewdowncount", renderDownCount);
router.get("/notifications", renderNotifications);
router.get("/notifications/:id/read", markAsRead);
router.get("/settings", renderSettings);

module.exports = router;
