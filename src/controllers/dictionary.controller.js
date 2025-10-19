// src/controllers/dictionary.controller.js
const apiError = require("../utils/apiError.js");
const apiResponse = require("../utils/apiResponse.js");
const asyncHandler = require("../utils/asyncHandler.js");
const User = require("../models/user.model.js");

// Import utilities and services
const { safeParseJsonFromText } = require("../utils/jsonRepair");
const { extractStructuredFromRaw } = require("../utils/heuristics");
const { normalizeParsedKeys } = require("../utils/normalizer");
const { callAIService } = require("../services/aiService");

const {
    escapeHtml,
    highlightTerm,
    renderAnyToHtml,
    convertStructuredToHtml,
} = require("../utils/htmlRenderer");

/**
 * GET /api/dictionary/:term
 */
const getTerm = asyncHandler(async (req, res, next) => {
    const { term } = req.params;
    const debug = req.query && (req.query.debug === "1" || req.query.debug === "true");

    const mistralKey = process.env.MISTRAL_API_KEY;

    if (!term || !term.trim()) return next(new apiError(400, "Missing term"));

    const normalized = term.trim();

    if (!mistralKey) {
        return next(new apiError(500, "Missing AI key"));
    }

    // Prepare prompts
    const systemPrompt = `
You are a legal expert AI. If possible, respond ONLY with a valid JSON object with these fields:
{
  "term": "<term>",
  "definition": "<short explanation>",
  "types": ["..."],
  "keyAspects": ["..."],
  "examples": ["..."],
  "stepByStep": ["..."],
  "notes": "<extra>",
  "relatedTerms": ["optional", "list"],
  "raw": "<long fallback text>"
}
If you cannot, provide a clear explanation with labeled sections (Definition:, Types:, Examples:, Key Aspects:, Steps:, Notes:, Related Terms:).
`.trim();

    const userPrompt = `Explain the legal term "${normalized}" in structured format as above.`;

    let rawText = "";
    try {
        rawText = await callAIService(normalized, {
            systemPrompt,
            userPrompt,
            max_tokens: 900,
            temperature: 0.1,
        });
        rawText = String(rawText || "").trim();
    } catch (err) {
        console.error("AI error:", err?.kind || err?.message || err);
        if (err.kind === "RATE_LIMIT") return next(new apiError(429, "AI rate limit"));
        if (err.kind === "ENOTFOUND")
            return next(new apiError(503, "AI unreachable (network/DNS)"));
        return next(new apiError(500, "AI request failed"));
    }

    // Attempt to parse JSON
    let parsed = safeParseJsonFromText(rawText);

    // If parsed but has markdown/extra around some fields, ensure arrays normalized
    if (parsed && typeof parsed === "object") {
        parsed = normalizeParsedKeys(parsed, normalized);
        // Return structured
        return res.status(200).json(
            new apiResponse(
                200,
                {
                    raw: rawText,
                    structured: parsed,
                    meta: {
                        term: normalized,
                        source: "AI-generated",
                        returnedAt: new Date().toISOString(),
                    },
                    debug: debug ? { parsedCandidate: parsed } : undefined,
                },
                "Success (structured)"
            )
        );
    }

    // JSON parse failed. Try heuristic extraction from raw text
    const heuristic = extractStructuredFromRaw(rawText, normalized);

    // Always return a structured object (either heuristic or minimally populated)
    const finalStructured = Object.assign(
        {
            term: normalized,
            definition:
                heuristic?.definition || (rawText ? rawText.split(/\n{2,}/)[0].slice(0, 120) : ""),
            types: heuristic?.types || [],
            keyAspects: heuristic?.keyAspects || [],
            examples: heuristic?.examples || [],
            stepByStep: heuristic?.stepByStep || [],
            notes: heuristic?.notes || "",
            relatedTerms: heuristic?.relatedTerms || [],
            raw: rawText,
        },
        heuristic || {}
    );

    return res.status(200).json(
        new apiResponse(
            200,
            {
                raw: rawText,
                structured: finalStructured,
                meta: {
                    term: normalized,
                    source: "AI-generated (raw)",
                    returnedAt: new Date().toISOString(),
                },
                debug: debug ? { heuristic } : undefined,
            },
            "Success (heuristic structured)"
        )
    );
});

/**
 * Render Dictionary Page
 */
const renderDictionaryPage = asyncHandler(async (req, res) => {
    res.render("pages/dictionary", { user: req.user || null });
});

/**
 * Save Term
 */
const saveTerm = asyncHandler(async (req, res, next) => {
    const { term } = req.body;
    if (!term) return res.status(400).json(new apiResponse(400, null, "Missing term"));
    if (!req.user) return res.status(401).json(new apiResponse(401, null, "User not logged in"));
    try {
        await User.updateOne({ _id: req.user._id }, { $addToSet: { savedTerms: term } });
        return res.status(200).json(new apiResponse(200, { term }, "Term saved"));
    } catch (err) {
        console.error("Error saving term:", err?.message || err);
        return next(err);
    }
});

/**
 * POST /dictionary/search
 * Returns JSON: { ok: true, html: "<partial>" }
 */
const searchTerm = asyncHandler(async (req, res, next) => {
    const term = req.body && req.body.term ? String(req.body.term).trim() : "";
    const debug = req.query && (req.query.debug === "1" || req.query.debug === "true");

    const mistralKey = process.env.MISTRAL_API_KEY;

    if (!term) return res.status(400).json({ ok: false, message: "Missing term" });

    let rawText = "";
    try {
        rawText = await callAIService(term, {
            systemPrompt: `You are a legal expert AI. If possible, return a JSON object describing the term.`,
            userPrompt: `Explain the legal term "${term}" in a structured JSON format.`,
            max_tokens: 900,
            temperature: 0.1,
        });
        rawText = String(rawText || "").trim();
    } catch (err) {
        console.error("AI error (search):", err?.kind || err?.message || err);
        rawText = `Unable to fetch definition for "${term}" due to an upstream error.`;
    }

    // Attempt structured parse
    let parsed = safeParseJsonFromText(rawText);

    if (parsed && typeof parsed === "object") {
        // normalize keys & nested structures
        parsed = normalizeParsedKeys(parsed, term);
    } else {
        const heur = extractStructuredFromRaw(rawText, term);
        parsed = Object.assign(
            {
                term,
                definition:
                    heur?.definition || (rawText ? rawText.split(/\n{2,}/)[0].slice(0, 600) : ""),
                types: heur?.types || [],
                keyAspects: heur?.keyAspects || [],
                examples: heur?.examples || [],
                stepByStep: heur?.stepByStep || [],
                notes: heur?.notes || "",
                relatedTerms: heur?.relatedTerms || [],
                raw: rawText,
            },
            heur || {}
        );
    }

    // Convert structured -> HTML pieces
    const { definitionHtml, aspectsHtml, examplesHtml, stepByStep, notes, relatedTerms } =
        convertStructuredToHtml(parsed, term);

    // determine if current user has saved this term (best-effort)
    let userSaved = false;
    try {
        if (req.user && Array.isArray(req.user.savedTerms)) {
            userSaved = req.user.savedTerms.includes(term);
        }
    } catch (e) {
        userSaved = false;
    }

    // Build a small aiMeta object from likely fields (defensive)
    const aiMeta = {};
    if (parsed && typeof parsed === "object") {
        if (typeof parsed.attempts !== "undefined") aiMeta.attempts = parsed.attempts;
        if (parsed.aiError) aiMeta.aiError = parsed.aiError;
        if (parsed.usedCacheFallback) aiMeta.usedCacheFallback = parsed.usedCacheFallback;
        // Some AI outputs may embed meta under meta or _aiMeta
        if (!aiMeta.attempts && parsed.meta && parsed.meta.attempts)
            aiMeta.attempts = parsed.meta.attempts;
        if (!aiMeta.aiError && parsed._aiError) aiMeta.aiError = parsed._aiError;
    }

    // Compose top-level meta (what will be returned in the JSON response)
    const topMeta = {
        term,
        source: parsed.source || "AI-generated",
        returnedAt: new Date().toISOString(),
    };
    if (Object.keys(aiMeta).length) topMeta.aiMeta = aiMeta;

    // Build viewModel that partial expects, expose baseUrl for share link generation
    const viewModel = {
        structured: parsed,
        definitionHtml,
        aspectsHtml,
        examplesHtml,
        stepByStep,
        notes,
        relatedTerms,
        user: req.user || null,
        userSaved,
        debug: debug ? { parsed, rawText, aiMeta } : undefined,
        meta: topMeta,
        escapeHtml,
        // pass baseUrl so template can render absolute share links server-side when available
        baseUrl: `${req.protocol}://${req.get("host")}`,
    };

    // Render partial to string
    res.render("partials/dictionary_result", viewModel, (err, html) => {
        if (err) {
            console.error("Partial render error:", err);
            return next(new apiError(500, "Failed to render result"));
        }
        return res
            .status(200)
            .json({ ok: true, html, meta: viewModel.meta, debug: viewModel.debug });
    });
});

module.exports = {
    getTerm,
    renderDictionaryPage,
    saveTerm,
    searchTerm,
};
