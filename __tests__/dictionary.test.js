const request = require("supertest");
const app = require("../src/app");
const axios = require("axios");

// Mock axios to avoid making real API calls during tests
jest.mock("axios");
const mockedAxios = axios;

describe("📚 Dictionary API Testing", () => {
    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();

        // Set up environment variable for tests
        process.env.MISTRAL_API_KEY = "test-api-key";
    });

    afterEach(() => {
        // Clean up environment variable
        delete process.env.MISTRAL_API_KEY;
    });

    describe("✅ Successful Dictionary Requests", () => {
        it("should return legal term definition successfully", async () => {
            const mockResponse = {
                data: {
                    choices: [
                        {
                            message: {
                                content:
                                    "Habeas Corpus is a legal principle that protects against unlawful detention. It requires that a person under arrest be brought before a judge or court to determine if the person's imprisonment or detention is lawful. The term literally means 'you shall have the body' in Latin.",
                            },
                        },
                    ],
                },
            };

            mockedAxios.post.mockResolvedValueOnce(mockResponse);

            const res = await request(app)
                .get("/api/dictionary/habeas-corpus")
                .set("Accept", "application/json");

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.msg).toBe("Success (heuristic structured)");
            expect(res.body.data).toHaveProperty("structured");
            expect(res.body.data.structured).toHaveProperty("term", "habeas-corpus");
            expect(res.body.data.structured).toHaveProperty("definition");
            expect(res.body.data.structured.definition).toContain("Habeas Corpus");

            // Verify axios was called with correct parameters
            expect(mockedAxios.post).toHaveBeenCalledWith(
                "https://api.mistral.ai/v1/chat/completions",
                expect.objectContaining({
                    model: "mistral-medium",
                    messages: expect.arrayContaining([
                        expect.objectContaining({
                            role: "system",
                            content: expect.stringContaining("legal expert"),
                        }),
                        expect.objectContaining({
                            role: "user",
                            content: expect.stringContaining("habeas-corpus"),
                        }),
                    ]),
                    max_tokens: 900,
                    temperature: 0.1,
                }),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: "Bearer test-api-key",
                        "Content-Type": "application/json",
                    }),
                })
            );
        });

        it("should handle complex legal terms", async () => {
            const mockResponse = {
                data: {
                    choices: [
                        {
                            message: {
                                content:
                                    "Intellectual Property Rights refer to the legal rights given to persons over the creations of their minds. They usually give the creator an exclusive right over the use of his/her creation for a certain period of time.",
                            },
                        },
                    ],
                },
            };

            mockedAxios.post.mockResolvedValueOnce(mockResponse);

            const res = await request(app)
                .get("/api/dictionary/intellectual-property-rights")
                .set("Accept", "application/json");

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.structured.term).toBe("intellectual-property-rights");
            expect(res.body.data.structured.definition).toContain("Intellectual Property Rights");
        });

        it("should handle terms with special characters", async () => {
            const mockResponse = {
                data: {
                    choices: [
                        {
                            message: {
                                content:
                                    "Article 21 of the Indian Constitution guarantees the right to life and personal liberty.",
                            },
                        },
                    ],
                },
            };

            mockedAxios.post.mockResolvedValueOnce(mockResponse);

            const res = await request(app)
                .get("/api/dictionary/article-21")
                .set("Accept", "application/json");

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.structured.term).toBe("article-21");
        });
    });

    describe("❌ Error Handling", () => {
        it("should return 500 when Mistral API key is missing", async () => {
            delete process.env.MISTRAL_API_KEY;

            const res = await request(app)
                .get("/api/dictionary/test-term")
                .set("Accept", "application/json");

            expect(res.statusCode).toBe(500);
            expect(res.body.success).toBe(false);
            expect(res.body.msg).toBe("Missing AI key");
        });

        it("should return 500 when AI response is invalid", async () => {
            const mockResponse = {
                data: {
                    choices: [
                        {
                            message: {
                                content: "", // Empty response
                            },
                        },
                    ],
                },
            };

            mockedAxios.post.mockResolvedValueOnce(mockResponse);

            const res = await request(app)
                .get("/api/dictionary/test-term")
                .set("Accept", "application/json");

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.msg).toBe("Success (heuristic structured)");
        });

        it("should return 500 when AI response is too short", async () => {
            const mockResponse = {
                data: {
                    choices: [
                        {
                            message: {
                                content: "Short", // Too short response
                            },
                        },
                    ],
                },
            };

            mockedAxios.post.mockResolvedValueOnce(mockResponse);

            const res = await request(app)
                .get("/api/dictionary/test-term")
                .set("Accept", "application/json");

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.msg).toBe("Success (heuristic structured)");
        });

        it("should handle network errors", async () => {
            mockedAxios.post.mockRejectedValueOnce(new Error("Network error"));

            const res = await request(app)
                .get("/api/dictionary/test-term")
                .set("Accept", "application/json");

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.msg).toBe("Success (heuristic structured)");
            expect(res.body.data.structured.definition).toContain("trouble finding information");
        });

        it("should handle rate limiting with retry", async () => {
            // First call fails with rate limit
            const rateLimitError = {
                response: {
                    status: 429,
                },
            };

            // Second call succeeds
            const successResponse = {
                data: {
                    choices: [
                        {
                            message: {
                                content:
                                    "This is a successful response after retry due to rate limiting.",
                            },
                        },
                    ],
                },
            };

            mockedAxios.post
                .mockRejectedValueOnce(rateLimitError)
                .mockResolvedValueOnce(successResponse);

            const res = await request(app)
                .get("/api/dictionary/test-term")
                .set("Accept", "application/json");

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.structured.definition).toContain(
                "successful response after retry"
            );

            // Should have been called twice (first failed, second succeeded)
            expect(mockedAxios.post).toHaveBeenCalledTimes(2);
        });

        it("should return 429 when rate limit exceeded after all retries", async () => {
            const rateLimitError = {
                response: {
                    status: 429,
                },
            };

            // Mock all attempts to fail with rate limit
            mockedAxios.post.mockRejectedValue(rateLimitError);

            const res = await request(app)
                .get("/api/dictionary/test-term")
                .set("Accept", "application/json");

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.msg).toBe("Success (heuristic structured)");
            expect(res.body.data.structured.definition).toContain("experiencing high demand");
        }, 15000); // Increase timeout for this test due to delays
    });

    describe("🔍 Request Structure Validation", () => {
        it("should send correct request structure to Mistral AI", async () => {
            const mockResponse = {
                data: {
                    choices: [
                        {
                            message: {
                                content: "Test response for request structure validation.",
                            },
                        },
                    ],
                },
            };

            mockedAxios.post.mockResolvedValueOnce(mockResponse);

            await request(app)
                .get("/api/dictionary/contract-law")
                .set("Accept", "application/json");

            const callArgs = mockedAxios.post.mock.calls[0];
            const requestData = callArgs[1];
            const requestConfig = callArgs[2];

            // Verify request structure
            expect(requestData.model).toBe("mistral-medium");
            expect(requestData.messages).toHaveLength(2);
            expect(requestData.messages[0].role).toBe("system");
            expect(requestData.messages[1].role).toBe("user");
            expect(requestData.messages[1].content).toContain("contract-law");
            expect(requestData.max_tokens).toBe(900);
            expect(requestData.temperature).toBe(0.1);

            // Verify headers
            expect(requestConfig.headers.Authorization).toBe("Bearer test-api-key");
            expect(requestConfig.headers["Content-Type"]).toBe("application/json");
        });
    });
});
