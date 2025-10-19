const axios = require("axios");

/**
 * Wrapper around internal callAI with retry logic for rate limiting
 * @param {string} term - The term to get information about
 * @param {Object} opts - Configuration options for the AI call
 * @returns {Promise<string>} The AI response text
 */
async function callAI(term, opts = {}) {
    const maxRetries = opts.maxRetries || 3;
    const retryDelay = opts.retryDelay || 1000; // 1 second default delay

    let attempt = 0;
    let lastError = null;

    while (attempt <= maxRetries) {
        try {
            // Call internal implementation
            return await internalCallAI(term, opts);
        } catch (err) {
            lastError = err;

            // If not a rate limit error or we've exceeded retries, throw the error
            if (err.kind !== "RATE_LIMIT" || attempt >= maxRetries) {
                throw err;
            }

            // For rate limit errors, wait and retry
            attempt++;
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
    }

    // All retries failed, throw the last error
    throw lastError;
}

/**
 * internal axios call implementation
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

module.exports = callAI;
