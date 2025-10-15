const axios = require("axios");

/**
 * Optional external callAI util
 */
let callAI = null;
try {
    callAI = require("../utils/callAI");
} catch (e) {
    callAI = null;
}

/**
 * internal axios call if callAI not present
 */
async function internalCallAI(term, opts = {}) {
    const key = process.env.MISTRAL_API_KEY;
    if (!key) {
        const err = new Error("MISTRAL_API_KEY not set");
        err.kind = "CONFIG";
        throw err;
    }
    const url = opts.url || "https://api.mistral.ai/v1/chat/completions";
    const payload = {
        model: opts.model || "mistral-medium",
        messages: [
            {
                role: "system",
                content:
                    opts.systemPrompt ||
                    "You are a legal expert AI. Return only a JSON object if possible.",
            },
            {
                role: "user",
                content: opts.userPrompt || `Provide the structured JSON for: "${term}"`,
            },
        ],
        max_tokens: opts.max_tokens || 900,
        temperature: typeof opts.temperature === "number" ? opts.temperature : 0.1,
    };
    try {
        const resp = await axios.post(url, payload, {
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            timeout: opts.timeout || 20000,
        });
        const content = resp?.data?.choices?.[0]?.message?.content;
        return String(content || "");
    } catch (err) {
        const e = new Error(err?.message || "AI call failed");
        e.kind = err?.code || (err?.response?.status === 429 ? "RATE_LIMIT" : "OTHER");
        e.original = err;
        throw e;
    }
}

/**
 * Main AI service function that calls AI using either external or internal implementation
 * @param {string} term - The term to get information about
 * @param {Object} options - Configuration options for the AI call
 * @returns {Promise<string>} The AI response text
 */
async function callAIService(term, options = {}) {
    try {
        if (callAI && typeof callAI === "function") {
            return await callAI(term, options);
        } else {
            return await internalCallAI(term, options);
        }
    } catch (error) {
        // console.error("AI service error:", error);
        throw error;
    }
}

module.exports = { callAIService };
