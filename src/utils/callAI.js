// src/utils/callAI.js
const axios = require("axios");

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * callAI(term, options)
 * - Returns raw string of the AI content on success.
 * - Throws an Error with .kind set to one of:
 *    - 'ENOTFOUND' (DNS / offline)
 *    - 'RATE_LIMIT' (429 after retries)
 *    - 'OTHER' (other HTTP/network errors)
 */
module.exports = async function callAI(term, opts = {}) {
    const key = process.env.MISTRAL_API_KEY;
    if (!key) {
        const e = new Error("MISTRAL_API_KEY not configured");
        e.kind = "CONFIG";
        throw e;
    }

    const maxAttempts = typeof opts.retries === "number" ? opts.retries : 3;
    let attempt = 0;
    let delayMs = 1000; // starting backoff

    const payload = {
        model: opts.model || "mistral-medium",
        messages: [
            { role: "system", content: opts.systemPrompt || `You are a legal expert...` },
            {
                role: "user",
                content: opts.userPrompt || `Provide the structured JSON for: "${term}"`,
            },
        ],
        max_tokens: opts.max_tokens || 900,
        temperature: typeof opts.temperature === "number" ? opts.temperature : 0.1,
    };

    const url = opts.url || "https://api.mistral.ai/v1/chat/completions";

    while (attempt < maxAttempts) {
        try {
            const resp = await axios.post(url, payload, {
                headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
                timeout: opts.timeout || 20000,
            });

            const content = resp?.data?.choices?.[0]?.message?.content;
            if (!content) {
                const e = new Error("No content returned from AI");
                e.kind = "OTHER";
                throw e;
            }
            return String(content).trim();
        } catch (err) {
            const code = err?.code; // e.g. ENOTFOUND, EAI_AGAIN
            const status = err?.response?.status;

            // DNS / network unreachable (no name resolution)
            if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
                const e = new Error(`DNS/network error contacting AI: ${code}`);
                e.kind = "ENOTFOUND";
                e.original = err;
                throw e;
            }

            // Rate-limited
            if (status === 429) {
                attempt++;
                if (attempt >= maxAttempts) {
                    const e = new Error("Rate limited by AI (429)");
                    e.kind = "RATE_LIMIT";
                    e.original = err;
                    throw e;
                }
                // backoff and retry
                await wait(delayMs);
                delayMs *= 2;
                continue;
            }

            // Other network/HTTP errors -> throw with OTHER
            const e = new Error(`AI request failed: ${err?.message || "unknown"}`);
            e.kind = "OTHER";
            e.original = err;
            throw e;
        }
    }

    // if exhausted loop (shouldn't hit)
    const e = new Error("AI request retries exhausted");
    e.kind = "RATE_LIMIT";
    throw e;
};
