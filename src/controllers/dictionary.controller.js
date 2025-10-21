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
You are a legal expert AI. First determine if the requested term is actually a legal term.

If the term is NOT a legal term (e.g., "india", "computer", "pizza"), respond with this JSON:
{
  "term": "<term>",
  "isLegalTerm": false,
  "message": "This is not a legal term. I specialize in legal terminology only. Please try searching for a legal term like contract, tort, divorce, or constitutional law."
}

If the term IS a legal term, respond ONLY with a valid JSON object with these fields:
{
  "term": "<term>",
  "isLegalTerm": true,
  "definition": "<short explanation without markdown formatting>",
  "types": ["..."],
  "keyAspects": ["..."],
  "examples": ["..."],
  "stepByStep": ["..."],
  "notes": "<extra>",
  "relatedTerms": ["optional", "list"]
}

IMPORTANT: Do not use markdown formatting like **bold**, [links], or {braces} in your responses. Use plain text only.
`.trim();

    const userPrompt = `Determine if "${normalized}" is a legal term and provide the appropriate structured response as described above.`;

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
        if (err.kind === "RATE_LIMIT") {
            // Provide a user-friendly rate limit message
            rawText = `We're experiencing high demand right now. Please try searching for "${normalized}" again in a few moments. As an alternative, you might want to check other legal resources or try a more specific search term.`;
        } else if (err.kind === "ENOTFOUND") {
            // Provide a user-friendly network error message
            rawText = `We're having trouble connecting to our legal dictionary service. Please check your internet connection and try searching for "${normalized}" again. If the problem persists, please try again later.`;
        } else {
            // Provide a helpful fallback definition for common legal terms
            const fallbackDefinitions = {
                "harassment": "Harassment is any unwanted behavior that creates a hostile or intimidating environment. In legal contexts, it typically refers to repeated actions intended to distress, threaten, or annoy another person. Harassment can take many forms including verbal, physical, or digital, and may be based on protected characteristics like race, gender, religion, or disability. Laws vary by jurisdiction but generally prohibit harassment in workplaces, schools, and public spaces.",
                "contract": "A contract is a legally binding agreement between two or more parties that creates obligations enforceable by law. For a contract to be valid, it typically requires an offer, acceptance, consideration (something of value exchanged), and mutual intent to be bound. Contracts can be written or oral, though certain types must be in writing to be enforceable.",
                "tort": "A tort is a civil wrong that causes a claimant to suffer loss or harm, resulting in legal liability for the person who commits the tortious act. Common types of torts include negligence, defamation, assault, and trespass. The injured party may sue for damages (compensation) to recover losses.",
                "divorce": "Divorce is the legal process of ending a marriage. It involves dividing property, determining child custody arrangements, and potentially providing spousal support (alimony) or child support. Divorce laws vary significantly by jurisdiction, with some places requiring separation periods or fault-based grounds, while others allow no-fault divorces."
            };
            
            const lowerTerm = normalized.toLowerCase();
            if (fallbackDefinitions[lowerTerm]) {
                rawText = fallbackDefinitions[lowerTerm];
            } else {
                rawText = `We're having trouble finding information about "${normalized}" right now. This could be due to technical issues or high demand. Please try again in a few moments. For reliable legal information, consider consulting with a qualified legal professional or checking official legal resources specific to your jurisdiction.`;
            }
        }
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
        
        // Provide a more user-friendly error message with fallback information
        if (err.kind === "RATE_LIMIT") {
            rawText = `We're experiencing high demand right now. Please try searching for "${term}" again in a few moments. As an alternative, you might want to check other legal resources or try a more specific search term.`;
        } else if (err.kind === "ENOTFOUND") {
            rawText = `We're having trouble connecting to our legal dictionary service. Please check your internet connection and try searching for "${term}" again. If the problem persists, please try again later.`;
        } else {
            // Provide a helpful fallback definition for common legal terms
            const fallbackDefinitions = {
                "harassment": "Harassment is any unwanted behavior that creates a hostile or intimidating environment. In legal contexts, it typically refers to repeated actions intended to distress, threaten, or annoy another person. Harassment can take many forms including verbal, physical, or digital, and may be based on protected characteristics like race, gender, religion, or disability. Laws vary by jurisdiction but generally prohibit harassment in workplaces, schools, and public spaces.",
                "contract": "A contract is a legally binding agreement between two or more parties that creates obligations enforceable by law. For a contract to be valid, it typically requires an offer, acceptance, consideration (something of value exchanged), and mutual intent to be bound. Contracts can be written or oral, though certain types must be in writing to be enforceable.",
                "tort": "A tort is a civil wrong that causes a claimant to suffer loss or harm, resulting in legal liability for the person who commits the tortious act. Common types of torts include negligence, defamation, assault, and trespass. The injured party may sue for damages (compensation) to recover losses.",
                "divorce": "Divorce is the legal process of ending a marriage. It involves dividing property, determining child custody arrangements, and potentially providing spousal support (alimony) or child support. Divorce laws vary significantly by jurisdiction, with some places requiring separation periods or fault-based grounds, while others allow no-fault divorces."
            };
            
            const lowerTerm = term.toLowerCase();
            if (fallbackDefinitions[lowerTerm]) {
                rawText = fallbackDefinitions[lowerTerm];
            } else {
                rawText = `We're having trouble finding information about "${term}" right now. This could be due to technical issues or high demand. Please try again in a few moments. For reliable legal information, consider consulting with a qualified legal professional or checking official legal resources specific to your jurisdiction.`;
            }
        }
    }

    // Attempt structured parse
    let parsed = safeParseJsonFromText(rawText);

    if (parsed && typeof parsed === "object") {
        // normalize keys & nested structures
        parsed = normalizeParsedKeys(parsed, term);
    } else {
        const heur = extractStructuredFromRaw(rawText, term);
        
        // Check if we have an error message from our improved error handling
        if (rawText.includes("We're experiencing high demand") || 
            rawText.includes("We're having trouble connecting") ||
            rawText.includes("We're having trouble finding information")) {
            // Use the error message as the definition
            parsed = {
                term,
                definition: rawText,
                types: [],
                keyAspects: [],
                examples: [],
                stepByStep: [],
                notes: "This information is provided as a fallback due to technical difficulties with our primary service.",
                relatedTerms: [],
                raw: rawText,
            };
        } else {
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
