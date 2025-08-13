const request = require("supertest");
const app = require("../src/app");
const Right = require("../src/models/rights.model");

describe("🛡️ Rights API Testing", () => {
    const mockRight = {
        name: "Protection of Interests of Minorities",
        articleNumber: "Article 29",
        description:
            "Ensures that minorities have the right to conserve their distinct language, script, or culture.",
        sourceLink: "https://indiankanoon.org/doc/1298951/",
        category: "Cultural and Educational Rights",
    };
    let createdRight;

    beforeAll(async () => {
        // console.log("🚀 Inserting mock right...");
        createdRight = await Right.create(mockRight);
        // console.log("✅ Mock right inserted:", createdRight);
    });

    afterAll(async () => {
        // console.log("🧹 Cleaning up DB...");
        await Right.deleteMany({});
        // console.log("✅ Cleanup done");
    });

    it("✅ should create a new right", async () => {
        // console.log("📤 Sending request to create new right...");
        const res = await request(app).post("/api/rights").set("Accept", "application/json").send({
            name: "Right to Approach Courts for Enforcement of Rights",
            articleNumber: "Article 32",
            description:
                "Grants citizens the right to move the Supreme Court directly for enforcement of fundamental rights through writs like habeas corpus, mandamus, prohibition, quo warranto, and certiorari.",
            sourceLink:
                "https://www.constitutionofindia.net/constitution_of_india/fundamental_rights/articles/Article%2032",
            category: "Right to Constitutional Remedies",
        });

        // console.log("📥 Response received:", res.body);
        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe("Right to Approach Courts for Enforcement of Rights");
    });

    it("❌ should return 400 if required fields are missing", async () => {
        // console.log("📤 Sending invalid data...");
        const res = await request(app).post("/api/rights").send({
            name: "",
            articleNumber: "",
            description: "",
            sourceLink: "",
            category: "",
        });

        // console.log("📥 Response received:", res.body);
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.msg).toMatch(/All fields are required/i);
    });

    it("❌ should return 400 if right with same name exists", async () => {
        // console.log("📤 Sending duplicate name...");
        const res = await request(app).post("/api/rights").send(mockRight);

        // console.log("📥 Response received:", res.body);
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.msg).toMatch(/already exists/i);
    });

    it("✅ should fetch all rights", async () => {
        // console.log("📤 Fetching all rights...");
        const res = await request(app).get("/api/rights").set("Accept", "application/json");

        // console.log("📥 Response received:", res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.msg).toBe("Rights fetched successfully");
    });

    it("✅ should fetch right by ID", async () => {
        // console.log(`📤 Fetching right by ID: ${createdRight._id}`);
        const res = await request(app)
            .get(`/api/rights/${createdRight._id}`)
            .set("Accept", "application/json");

        // console.log("📥 Response received:", res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe(createdRight.name);
        expect(res.body.msg).toBe("Right fetched successfully");
    });

    it("❌ should return 404 if right not found", async () => {
        const fakeId = "64b4c7fe12f84b1f12345678";
        // console.log(`📤 Fetching non-existent right by ID: ${fakeId}`);
        const res = await request(app).get(`/api/rights/${fakeId}`);

        // console.log("📥 Response received:", res.body);
        expect(res.statusCode).toBe(404);
        expect(res.body.success).toBe(false);
        expect(res.body.msg).toMatch(/not found/i);
    });

    it("✅ should update a right successfully", async () => {
        // console.log(`📤 Updating right ID: ${createdRight._id}`);
        const res = await request(app).put(`/api/rights/${createdRight._id}`).send({
            description: "Updated description",
        });

        // console.log("📥 Response received:", res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.description).toBe("Updated description");
        expect(res.body.msg).toBe("Right updated successfully");
    });

    it("❌ should return 404 if updating non-existent right", async () => {
        const res = await request(app)
            .put("/api/rights/64b4c7fe12f84b1f12345678")
            .send({ description: "Doesn't matter" });

        // console.log("📥 Response received:", res.body);
        expect(res.statusCode).toBe(404);
        expect(res.body.success).toBe(false);
        expect(res.body.msg).toMatch(/not found/i);
    });

    it("✅ should delete a right successfully", async () => {
        // console.log(`📤 Deleting right ID: ${createdRight._id}`);
        const res = await request(app).delete(`/api/rights/${createdRight._id}`);

        // console.log("📥 Response received:", res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.msg).toBe("Right deleted successfully");
    });

    it("❌ should return 404 when deleting non-existent right", async () => {
        const res = await request(app).delete("/api/rights/64b4c7fe12f84b1f12345678");

        // console.log("📥 Response received:", res.body);
        expect(res.statusCode).toBe(404);
        expect(res.body.success).toBe(false);
        expect(res.body.msg).toMatch(/not found/i);
    });
});