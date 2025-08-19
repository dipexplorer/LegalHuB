const request = require("supertest");
const app = require("../src/app");
const Right = require("../src/models/rights.model");
const Document = require("../src/models/document.model");

describe("🔍 Search API Testing", () => {
    let testRight;
    let testDocument;

    const mockRight = {
        name: "Right to Education",
        articleNumber: "Article 21A",
        description:
            "The state shall provide free and compulsory education to all children of the age of six to fourteen years.",
        sourceLink: "https://indiankanoon.org/doc/1298951/",
        category: "Cultural and Educational Rights",
    };

    const mockDocument = {
        title: "Education Scholarship Scheme",
        description: "Government scholarship for students pursuing higher education",
        downloadLink: "https://example.com/download",
        applyLink: "https://example.com/apply",
        state: "Delhi",
        department: "Education",
        guidelines: ["Must be a resident of Delhi", "Minimum 80% marks required"],
        requiredDocuments: ["Aadhar Card", "Mark Sheet"],
    };

    beforeAll(async () => {
        // Clean up existing data
        await Right.deleteMany({});
        await Document.deleteMany({});

        // Create test data
        testRight = await Right.create(mockRight);
        testDocument = await Document.create(mockDocument);
    });

    afterAll(async () => {
        // Clean up test data
        await Right.deleteMany({});
        await Document.deleteMany({});
    });

    describe("✅ Valid Search Queries", () => {
        it("should search and find rights by name", async () => {
            const res = await request(app)
                .get("/api/search")
                .query({ query: "education" })
                .set("Accept", "application/json");

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.msg).toBe("Search results fetched successfully");
            expect(res.body.data).toHaveProperty("rights");
            expect(res.body.data).toHaveProperty("documents");
            expect(Array.isArray(res.body.data.rights)).toBe(true);
            expect(Array.isArray(res.body.data.documents)).toBe(true);

            // Should find the right with "education" in name
            const foundRight = res.body.data.rights.find((r) =>
                r.name.toLowerCase().includes("education")
            );
            expect(foundRight).toBeDefined();
            expect(foundRight.name).toBe(mockRight.name);
        });

        it("should search and find documents by title", async () => {
            const res = await request(app)
                .get("/api/search")
                .query({ query: "scholarship" })
                .set("Accept", "application/json");

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);

            // Should find the document with "scholarship" in title
            const foundDocument = res.body.data.documents.find((d) =>
                d.title.toLowerCase().includes("scholarship")
            );
            expect(foundDocument).toBeDefined();
            expect(foundDocument.title).toBe(mockDocument.title);
        });

        it("should search and find documents by state", async () => {
            const res = await request(app)
                .get("/api/search")
                .query({ query: "delhi" })
                .set("Accept", "application/json");

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);

            // Should find the document with "delhi" as state
            const foundDocument = res.body.data.documents.find((d) =>
                d.state.toLowerCase().includes("delhi")
            );
            expect(foundDocument).toBeDefined();
            expect(foundDocument.state).toBe(mockDocument.state);
        });

        it("should search and find documents by department", async () => {
            const res = await request(app)
                .get("/api/search")
                .query({ query: "education" })
                .set("Accept", "application/json");

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);

            // Should find both right and document with "education"
            expect(res.body.data.rights.length).toBeGreaterThan(0);
            expect(res.body.data.documents.length).toBeGreaterThan(0);
        });

        it("should perform case-insensitive search", async () => {
            const res = await request(app)
                .get("/api/search")
                .query({ query: "EDUCATION" })
                .set("Accept", "application/json");

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);

            // Should find results despite uppercase query
            const foundRight = res.body.data.rights.find((r) =>
                r.name.toLowerCase().includes("education")
            );
            expect(foundRight).toBeDefined();
        });

        it("should search by partial matches", async () => {
            const res = await request(app)
                .get("/api/search")
                .query({ query: "educ" })
                .set("Accept", "application/json");

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);

            // Should find results with partial match
            const foundRight = res.body.data.rights.find((r) =>
                r.name.toLowerCase().includes("education")
            );
            expect(foundRight).toBeDefined();
        });

        it("should return empty arrays when no matches found", async () => {
            const res = await request(app)
                .get("/api/search")
                .query({ query: "nonexistentterm12345" })
                .set("Accept", "application/json");

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.rights).toEqual([]);
            expect(res.body.data.documents).toEqual([]);
        });
    });

    describe("❌ Invalid Search Queries", () => {
        it("should return 400 when query parameter is missing", async () => {
            const res = await request(app).get("/api/search").set("Accept", "application/json");

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.msg).toBe("Search query is required");
        });

        it("should return 400 when query parameter is empty", async () => {
            const res = await request(app)
                .get("/api/search")
                .query({ query: "" })
                .set("Accept", "application/json");

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.msg).toBe("Search query is required");
        });

        it("should handle special characters in search query", async () => {
            const res = await request(app)
                .get("/api/search")
                .query({ query: "test@#$%^&*()" })
                .set("Accept", "application/json");

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            // Should return empty results for special characters
            expect(res.body.data.rights).toEqual([]);
            expect(res.body.data.documents).toEqual([]);
        });
    });

    describe("🔍 Search Result Structure", () => {
        it("should return correct data structure", async () => {
            const res = await request(app)
                .get("/api/search")
                .query({ query: "education" })
                .set("Accept", "application/json");

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty("success", true);
            expect(res.body).toHaveProperty("data");
            expect(res.body).toHaveProperty("msg", "Search results fetched successfully");

            expect(res.body.data).toHaveProperty("rights");
            expect(res.body.data).toHaveProperty("documents");

            // Check rights structure
            if (res.body.data.rights.length > 0) {
                const right = res.body.data.rights[0];
                expect(right).toHaveProperty("name");
                expect(right).toHaveProperty("description");
                expect(right).toHaveProperty("articleNumber");
                expect(right).toHaveProperty("category");
                expect(right).toHaveProperty("sourceLink");
            }

            // Check documents structure
            if (res.body.data.documents.length > 0) {
                const document = res.body.data.documents[0];
                expect(document).toHaveProperty("title");
                expect(document).toHaveProperty("description");
                expect(document).toHaveProperty("state");
                expect(document).toHaveProperty("department");
                expect(document).toHaveProperty("downloadLink");
                expect(document).toHaveProperty("applyLink");
            }
        });
    });
});
