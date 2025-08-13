const axios = require("axios");
const apiError = require("../utils/apiError.js");
const apiResponse = require("../utils/apiResponse.js");
const asyncHandler = require("../utils/asyncHandler.js");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getTerm = asyncHandler(async (req, res, next) => {
    const { term } = req.params;

    console.log("🔎 Requesting Mistral AI for:", term);

    if (!process.env.MISTRAL_API_KEY) {
        return next(new apiError(500, "Missing Mistral AI API key"));
    }

    let attempts = 3; // Retry up to 3 times
    let delayTime = 2000; // Start with a 2-second delay

    for (let i = 0; i < attempts; i++) {
        try {
            const response = await axios.post(
                "https://api.mistral.ai/v1/chat/completions",
                {
                    model: "mistral-medium", // Use 'mixtral-8x7B' for better results
                    messages: [
                        {
                            role: "system",
                            content:
                                "You are a legal expert providing definitions, explanations, and step-by-step application guides for legal terms.",
                        },
                        {
                            role: "user",
                            content: `Explain the legal term: "${term}" with examples, details, and provide step-by-step instructions to apply for the related document.`,
                        },
                    ],
                    max_tokens: 500,
                    temperature: 0.3,
                },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            const responseText = response.data.choices?.[0]?.message?.content?.trim();
            if (!responseText || responseText.length < 10) {
                throw new apiError(500, "Invalid AI response");
            }

            console.log("✅ AI Response:", responseText);
            return res
                .status(200)
                .json(new apiResponse(200, { term, response: responseText }, "Success"));
        } catch (error) {
            if (error.response?.status === 429) {
                console.warn(`⚠️ Rate limit hit. Retrying in ${delayTime / 1000} seconds...`);
                await delay(delayTime);
                delayTime *= 2; // Exponential backoff
            } else {
                return next(error);
            }
        }
    }

    return next(new apiError(429, "Rate limit exceeded. Try again later."));
});

module.exports = { getTerm };
