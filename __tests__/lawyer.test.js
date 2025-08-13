const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/user.model");

describe("👨‍⚖️Lawyers API testing", () => {
    const mockLawyer = {
        name: "Test Lawyer",
        email: "lawyer@example.com",
        role: "user",
        specialization: "Criminal Law",
        licenseNumber: "ABC123",
        experience: 5,
    };

    let createdUser;

    // Insert mock data before test run
    beforeAll(async () => {
        // console.log("⏳ Inserting mock lawyer...");
        createdUser = await User.create(mockLawyer);
        // console.log("✅ Inserted lawyer:", createdUser.toObject());
    });

    // Clean DB after tests
    afterAll(async () => {
        // console.log("🧹 Cleaning up users...");
        const result = await User.deleteMany({});
        // console.log("✅ Cleanup result:", result);
    });

    it("should return 200 and include the inserted lawyer", async () => {
        // console.log("📤 Sending GET request to /api/lawyers...");
        const res = await request(app).get("/api/lawyers").set("Accept", "application/json");

        // console.log("📥 Response status:", res.statusCode);
        // console.log("📥 Response body:", JSON.stringify(res.body, null, 2));

        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("success", true);
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.msg).toBe("Lawyers fetched successfully");

        const lawyer = res.body.data.find((l) => l.email === mockLawyer.email);

        // console.log("🔍 Found lawyer in response:", lawyer);

        expect(lawyer).toBeDefined();
        expect(lawyer.name).toBe(mockLawyer.name);
        expect(lawyer.specialization).toBe(mockLawyer.specialization);
        expect(lawyer.experience).toBe(mockLawyer.experience);
        expect(lawyer.licenseNumber).toBe(mockLawyer.licenseNumber);
    });

    it("✅ should fetch a single lawyer by ID", async () => {
        const res = await request(app)
            .get(`/api/lawyers/verify/${createdUser._id}`)
            .set("Accept", "application/json");

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.email).toBe(mockLawyer.email);
        expect(res.body.data.name).toBe(mockLawyer.name);
        expect(res.body.msg).toBe("Lawyer profile fetched successfully");
    });
});
