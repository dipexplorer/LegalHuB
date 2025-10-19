const request = require("supertest");
const app = require("../src/app");
const Document = require("../src/models/document.model");

describe("📄 Documents API", () => {
    const mockDocument = {
        title: "Test Scheme",
        description: "This is a test government scheme.",
        downloadLink: "https://example.com/download",
        applyLink: "https://example.com/apply",
        state: "Delhi",
        department: "Education",
        guidelines: "Follow these test guidelines",
        requiredDocuments: ["Aadhar Card", "Income Certificate"],
    };

    let createdDocument;

    beforeAll(async () => {
        // console.log("📦 Creating mock document...");
        createdDocument = await Document.create(mockDocument);
        // console.log("✅ Mock document created:", createdDocument.toObject());
    });

    afterAll(async () => {
        // console.log("🧹 Cleaning up test documents...");
        await Document.deleteMany({});
        // console.log("✅ Database cleanup complete.");
    });

    it("✅ should return 200 and list all documents", async () => {
        // console.log("📤 Sending GET request to /api/documents...");
        const res = await request(app).get("/api/documents");

        // console.log("📥 Response status:", res.statusCode);
        // console.log("📥 Response body:", res.body);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data.documents)).toBe(true);
        expect(res.body.msg).toBe("Documents fetched successfully");

        const found = res.body.data.documents.find(
            (doc) => doc._id === String(createdDocument._id)
        );
        // console.log("🔍 Found document in list:", found);
        expect(found).toBeDefined();
    });

    it("✅ should return 200 and the document by ID", async () => {
        // console.log(`📤 Sending GET request to /api/documents/${createdDocument._id}`);
        const res = await request(app)
            .get(`/api/documents/${createdDocument._id}`)
            .set("Accept", "application/json");

        // console.log("📥 Response status:", res.statusCode);
        // console.log("📥 Response body:", res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.title).toBe(mockDocument.title);
    });

    it("✅ should create a new document", async () => {
        const newDoc = {
            title: "New Scheme",
            description: "Another description",
            downloadLink: "https://example.com/new-download",
            applyLink: "https://example.com/new-apply",
            state: "Maharashtra",
            department: "Health",
            guidelines: "New guidelines",
            requiredDocuments: ["PAN Card", "Address Proof"],
        };

        // console.log("📤 Sending POST request to /api/documents with:", newDoc);
        const res = await request(app)
            .post("/api/documents")
            .send(newDoc)
            .set("Accept", "application/json");

        // console.log("📥 Response status:", res.statusCode);
        // console.log("📥 Response body:", res.body);

        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.title).toBe("New Scheme");
    });

    it("✅ should update a document", async () => {
        const updatedData = { title: "Updated Scheme Title" };

        // console.log(`📤 Sending PUT request to /api/documents/${createdDocument._id} with:`, updatedData);
        const res = await request(app)
            .put(`/api/documents/${createdDocument._id}`)
            .send(updatedData);

        // console.log("📥 Response status:", res.statusCode);
        // console.log("📥 Response body:", res.body);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.title).toBe("Updated Scheme Title");
    });

    it("✅ should delete the document", async () => {
        // console.log(`🗑️ Sending DELETE request to /api/documents/${createdDocument._id}`);
        const res = await request(app).delete(`/api/documents/${createdDocument._id}`);

        // console.log("📥 Response status:", res.statusCode);
        // console.log("📥 Response body:", res.body);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.msg).toBe("Document deleted successfully");

        const check = await Document.findById(createdDocument._id);
        // console.log("🔎 Checking if document still exists in DB:", check);
        expect(check).toBeNull();
    });

    // ❌ Get document that doesn't exist
    it("❌ should return 404 for non-existent document ID", async () => {
        // console.log("❌ Attempting to fetch non-existent document...");
        const fakeId = "64b4c7fe12f84b1f12345678";

        const res = await request(app).get(`/api/documents/${fakeId}`);
        // console.log("📥 Response status:", res.statusCode);

        // Debug code removed - was writing to debug_response.json

        expect(res.statusCode).toBe(404);
        expect(res.body.success).toBe(false);
        expect(res.body.msg).toBe("Document not found");
        // console.log("📥 Response body:", res.body);
    });

    // ❌ Update non-existent document
    it("❌ should return 404 when updating non-existent document", async () => {
        // console.log("❌ Attempting to update non-existent document...");
        const fakeId = "64b4c7fe12f84b1f12345678";
        const res = await request(app).put(`/api/documents/${fakeId}`).send({
            title: "Should Not Work",
        });

        // console.log("📥 Response status:", res.statusCode);
        expect(res.statusCode).toBe(404);
        expect(res.body.success).toBe(false);
        expect(res.body.msg).toBe("Document not found");
        // console.log("📥 Response body:", res.body);
    });

    // ❌ Delete non-existent document
    it("❌ should return 404 when deleting non-existent document", async () => {
        // console.log("❌ Attempting to delete non-existent document...");
        const fakeId = "64b4c7fe12f84b1f12345678";
        const res = await request(app).delete(`/api/documents/${fakeId}`);

        // console.log("📥 Response status:", res.statusCode);
        expect(res.statusCode).toBe(404);
        expect(res.body.success).toBe(false);
        expect(res.body.msg).toBe("Document not found");
        // console.log("📥 Response body:", res.body);
    });

    // ❌ Create document with missing required fields
    it("❌ should return 400 when creating document with missing fields", async () => {
        const incompleteDoc = {
            title: "Incomplete Document",
            // Missing required fields
        };

        const res = await request(app)
            .post("/api/documents")
            .send(incompleteDoc)
            .set("Accept", "application/json");

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    // ❌ Create document with invalid state
    it("❌ should return 400 when creating document with invalid state", async () => {
        const invalidDoc = {
            title: "Invalid State Document",
            description: "Test description",
            downloadLink: "https://example.com/download",
            applyLink: "https://example.com/apply",
            state: "Invalid State",
            department: "Test Department",
            guidelines: ["Test guideline"],
            requiredDocuments: ["Test document"],
        };

        const res = await request(app)
            .post("/api/documents")
            .send(invalidDoc)
            .set("Accept", "application/json");

        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });
});
