const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/user.model");

describe("📄 User API Testing", () => {
    let agent;
    let userId;

    const testUser = {
        username: "testuser",
        email: "test@example.com",
        password: "Test@1234",
        confirmPassword: "Test@1234",
        role: "user",
    };

    beforeAll(async () => {
        // console.log("🚀 Inserting test user...");
        await User.deleteMany({});
        agent = request.agent(app); // to maintain session for login/logout

        // Log in the user (assuming login route sets session/cookie)
        await agent.post("/api/users/login").set("Accept", "application/json").send({
            username: testUser.username,
            password: testUser.password,
        });
    });

    afterAll(async () => {
        // console.log("🧹 Cleaning up DB...");
        await User.deleteMany({});
    });

    it("✅ should create an new user", async () => {
        // console.log("📤 Creating user...");
        const res = await agent
            .post("/api/users/register")
            .set("Accept", "application/json")
            .send(testUser);

        userId = res.body.data._id;

        // console.log("📥 Response status:", res.statusCode);
        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.msg).toBe("User registered successfully");
    });

    // ❌ JSON: Missing fields
    it("should return 400 JSON error when required fields are missing", async () => {
        // console.log("📤 Attempting to register without required fields...");
        const res = await request(app)
            .post("/api/users/register")
            .set("Accept", "application/json")
            .send({ role: "user" });

        // console.log("📥 Response status:", res.statusCode);
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.msg).toBe("All fields are required");
    });

    // ❌ JSON: Password mismatch
    it("should return 400 JSON error for password mismatch", async () => {
        // console.log("📤 Attempting to register with mismatched passwords...");
        const res = await request(app)
            .post("/api/users/register")
            .set("Accept", "application/json")
            .send({ ...testUser, confirmPassword: "DifferentPass@123" });

        // console.log("📥 Response status:", res.statusCode);
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.msg).toBe("Passwords do not match");
    });

    // ❌ JSON: User already exists
    it("should return 400 JSON error if user already exists", async () => {
        // console.log("📤 Attempting to register an existing user...");
        const res = await request(app)
            .post("/api/users/register")
            .set("Accept", "application/json")
            .send(testUser);

        // console.log("📥 Response status:", res.statusCode);
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.msg).toBe("User with given email or username already exists");
    });

    // 📌 Get User Profile
    it("✅ should fetch user profile", async () => {
        // console.log("📤 Fetching user profile...");
        const res = await request(app)
            .get("/api/users/profile")
            .set("Accept", "application/json")
            .send({ author: userId }); // Pass author for test authentication

        // console.log("📥 Response status:", res.statusCode);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.username).toBe(testUser.username);
    });

    // 📌 Update User Profile
    it("✅ should update user profile", async () => {
        // console.log("📤 Updating user profile...");
        const updatedData = {
            username: "updateduser",
            email: "updated@example.com",
            author: userId,
        };
        const res = await request(app)
            .put("/api/users/update")
            .set("Accept", "application/json")
            .send(updatedData);

        // console.log("📥 Response status:", res.statusCode);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.username).toBe(updatedData.username);
        expect(res.body.data.email).toBe(updatedData.email);
    });

    // 📌 Delete User
    it("✅ should delete user account", async () => {
        // console.log("📤 Deleting user account...");
        const res = await request(app)
            .delete("/api/users/delete")
            .set("Accept", "application/json")
            .send({ author: userId });

        // console.log("📥 Response status:", res.statusCode);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.msg).toBe("User deleted successfully");

        // Verify user is deleted
        const user = await User.findOne({ email: testUser.email });
        expect(user).toBeNull();
    });
});
