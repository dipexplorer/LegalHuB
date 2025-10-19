// src/routes/dictionary.routes.js
const express = require("express");
const router = express.Router();

// Controller handlers
const {
    getTerm,
    renderDictionaryPage,
    saveTerm,
    searchTerm,
} = require("../controllers/dictionary.controller");

// Optional auth middleware (uncomment and use if available)
// const requireAuth = require("../middlewares/auth.middleware");

// Render UI page
// GET /dictionary
router.get("/", renderDictionaryPage);

// New: server-rendered partial search (no full page reload)
// POST /dictionary/search
router.post("/search", searchTerm);

// Existing API (kept for backwards compatibility)
// GET /api/dictionary/:term  (when mounted under /api/dictionary)
router.get("/:term", getTerm);

// Save a term for the logged-in user
// POST /api/dictionary/save
// If you have auth middleware, enable it: router.post("/save", requireAuth, saveTerm);
router.post("/save", saveTerm);

module.exports = router;
