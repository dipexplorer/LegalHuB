const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/user.model");
const Article = require("../src/models/article.model");

describe("📄 Articles API Testing", () => {
    let testUser;
    let anotherUser;
    let createdArticle;

    beforeAll(async () => {
        // console.log("🚀 Inserting test user...");
        testUser = await User.create({
            name: "Test User",
            email: "testuser@example.com",
            password: "testpass123",
            role: "user",
        });
        // console.log("✅ User inserted:", testUser.email);
        anotherUser = await User.create({
            name: "Another User",
            email: "anotheruser@example.com",
            password: "testpass123",
            role: "user",
        });
        // console.log("✅ Another user inserted:", anotherUser.email);
    });

    afterAll(async () => {
        // console.log("🧹 Cleaning up DB...");
        await User.deleteMany({});
        await Article.deleteMany({});
        // console.log("✅ Cleanup done");
    });

    it("✅ should create an article using the user's ID", async () => {
        // console.log("📤 Creating article...");
        const res = await request(app)
            .post("/api/articles")
            .set("Accept", "application/json")
            .send({
                title: "Test Article Title",
                content: "This is the content of the test article.",
                tags: ["testing", "article"],
                author: testUser._id,
            });

        // console.log("📥 Response status:", res.statusCode);
        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.title).toBe("Test Article Title");

        const article = await Article.findOne({ title: "Test Article Title" });
        // console.log("🔍 Created article:", article);
        createdArticle = article;
    });

    it("📥 should fetch all articles and include the one just created", async () => {
        // console.log("📤 Fetching all articles...");
        const res = await request(app).get("/api/articles").set("Accept", "application/json");

        // console.log("📥 Fetched:", res.body.data.map(a => a.title));
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.msg).toBe("Articles fetched successfully");

        const found = res.body.data.find((a) => a.title === "Test Article Title");
        expect(found).toBeDefined();
        expect(found.content).toBe("This is the content of the test article.");
        expect(found.author.email).toBe("testuser@example.com");
    });

    it("📥 should fetch a single article by ID", async () => {
        // console.log("📤 Fetching article by ID...");
        const res = await request(app)
            .get(`/api/articles/${createdArticle._id}`)
            .set("Accept", "application/json");

        // console.log("📥 Fetched article:", res.body.data.title);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.title).toBe("Test Article Title");
    });

    it("📤 should update an article by owner", async () => {
        // console.log("📤 Updating article...");
        const res = await request(app)
            .put(`/api/articles/${createdArticle._id}`)
            .set("Accept", "application/json")
            .send({
                author: testUser._id,
                title: "Updated Article Title",
                content: "This is the updated content of the test article.",
            });

        // console.log("📥 Update response:", res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.title).toBe("Updated Article Title");
    });

    it("📤 should delete an article by owner", async () => {
        // console.log("📤 Deleting article...");
        const res = await request(app)
            .delete(`/api/articles/${createdArticle._id}`)
            .set("Accept", "application/json")
            .send({ author: testUser._id }); // Ensure author is set

        // console.log("📥 Delete response:", res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.msg).toBe("Article deleted successfully");

        const deletedArticle = await Article.findById(createdArticle._id);
        expect(deletedArticle).toBeNull();
    });

    it("❌ should not create an article without title/content", async () => {
        const res = await request(app).post("/api/articles").send({ author: testUser._id }); // Missing title and content

        // console.log("📥 Missing field create response:", res.body);
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.msg).toMatch(/title and content are required/i);
    });

    it("❌ should return 404 for non-existent article", async () => {
        const fakeId = "64b5fcafe2f3a2cdd0123456";

        const res = await request(app)
            .get(`/api/articles/${fakeId}`)
            .set("Accept", "application/json");

        // console.log("📥 Non-existent article fetch:", res.body);
        expect(res.statusCode).toBe(404);
        expect(res.body.msg).toBe("Article not found");
    });

    it("❌ should return 404 when updating non-existent article", async () => {
        const fakeId = "64b5fcafe2f3a2cdd0123456";
        const res = await request(app)
            .put(`/api/articles/${fakeId}`)
            .send({ title: "Should Fail", author: testUser._id });

        // console.log("📥 Update non-existent article response:", res.body);
        expect(res.statusCode).toBe(404);
        expect(res.body.msg).toBe("Article not found");
    });

    it("❌ should return 404 when deleting non-existent article", async () => {
        const fakeId = "64b5fcafe2f3a2cdd0123456";
        const res = await request(app)
            .delete(`/api/articles/${fakeId}`)
            .send({ author: testUser._id });

        // console.log("📥 Delete non-existent article response:", res.body);
        expect(res.statusCode).toBe(404);
        expect(res.body.msg).toBe("Article not found");
    });

    it("❌ should not allow unauthorized user to delete an article", async () => {
        // Create article again for this test
        const article = await Article.create({
            title: "Protected Article",
            content: "Only owner can delete",
            tags: ["protected"],
            author: testUser._id,
        });

        const res = await request(app)
            .delete(`/api/articles/${article._id}`)
            .set("Accept", "application/json")
            .send({ author: anotherUser._id });

        // console.log("🚫 Unauthorized delete response:", res.body);

        expect([403, 404]).toContain(res.statusCode); // in case deleted already
        if (res.statusCode === 403) {
            expect(res.body.msg).toBe("You are not authorized to edit/delete this article");
        } else {
            expect(res.body.msg).toBe("Article not found");
        }
    });
});
