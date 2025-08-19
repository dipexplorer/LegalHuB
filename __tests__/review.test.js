const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/user.model");
const LawyerProfile = require("../src/models/lawyer.model");
const Review = require("../src/models/review.model");

describe("⭐ Review API Testing", () => {
    let testClient;
    let testLawyer;
    let testLawyerProfile;
    let testReview;

    const mockClient = {
        username: "reviewclient",
        name: "Review Client",
        email: "reviewclient@example.com",
        role: "user",
    };

    const mockLawyer = {
        username: "reviewlawyer",
        name: "Review Lawyer",
        email: "reviewlawyer@example.com",
        role: "lawyer",
    };

    const mockLawyerProfile = {
        specialization: "Family Law",
        licenseNumber: "FAM123456",
        experience: 8,
        city: "Delhi",
        state: "Delhi",
        isVerified: true,
        isActive: true,
    };

    beforeAll(async () => {
        // Clean up existing data
        await Review.deleteMany({});
        await LawyerProfile.deleteMany({});
        await User.deleteMany({});

        // Create test users
        testClient = await User.create(mockClient);
        testLawyer = await User.create(mockLawyer);

        // Create lawyer profile
        testLawyerProfile = await LawyerProfile.create({
            user: testLawyer._id,
            ...mockLawyerProfile,
        });

        // Link lawyer profile to user
        testLawyer.lawyerProfile = testLawyerProfile._id;
        await testLawyer.save();
    });

    afterAll(async () => {
        // Clean up test data
        await Review.deleteMany({});
        await LawyerProfile.deleteMany({});
        await User.deleteMany({});
    });

    describe("✅ Create Review", () => {
        it("should create a review successfully", async () => {
            const reviewData = {
                review: {
                    rating: 5,
                    comment:
                        "Excellent lawyer! Very professional and knowledgeable. Helped me with my family law case efficiently.",
                },
                author: testClient._id, // For test authentication
            };

            const res = await request(app)
                .post(`/api/reviews/${testLawyer._id}`)
                .set("Accept", "application/json")
                .send(reviewData);

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.msg).toBe("Review added successfully");
            expect(res.body.data).toHaveProperty("rating", 5);
            expect(res.body.data).toHaveProperty("comment", reviewData.review.comment);
            expect(res.body.data).toHaveProperty("lawyer", testLawyer._id.toString());
            expect(res.body.data).toHaveProperty("author", testClient._id.toString());

            testReview = res.body.data;

            // Verify review was added to lawyer's profile
            const updatedLawyer = await User.findById(testLawyer._id).populate("lawyerProfile");
            const reviewIds = updatedLawyer.lawyerProfile.reviews.map((id) => id.toString());
            expect(reviewIds).toContain(testReview._id.toString());
        });

        it("should return 400 when rating is missing", async () => {
            const reviewData = {
                review: {
                    comment: "Good lawyer but missing rating",
                },
                author: testClient._id,
            };

            const res = await request(app)
                .post(`/api/reviews/${testLawyer._id}`)
                .set("Accept", "application/json")
                .send(reviewData);

            expect(res.statusCode).toBe(302); // Redirect due to flash message
        });

        it("should return 400 when comment is missing", async () => {
            const reviewData = {
                review: {
                    rating: 4,
                },
                author: testClient._id,
            };

            const res = await request(app)
                .post(`/api/reviews/${testLawyer._id}`)
                .set("Accept", "application/json")
                .send(reviewData);

            expect(res.statusCode).toBe(302); // Redirect due to flash message
        });

        it("should return error when comment exceeds 500 characters", async () => {
            const longComment = "A".repeat(501); // 501 characters
            const reviewData = {
                review: {
                    rating: 4,
                    comment: longComment,
                },
                author: testClient._id,
            };

            const res = await request(app)
                .post(`/api/reviews/${testLawyer._id}`)
                .set("Accept", "application/json")
                .send(reviewData);

            expect(res.statusCode).toBe(302); // Redirect due to flash message
        });

        it("should prevent user from reviewing themselves", async () => {
            const reviewData = {
                review: {
                    rating: 5,
                    comment: "Trying to review myself",
                },
                author: testLawyer._id, // Same as lawyer being reviewed
            };

            const res = await request(app)
                .post(`/api/reviews/${testLawyer._id}`)
                .set("Accept", "application/json")
                .send(reviewData);

            expect(res.statusCode).toBe(302); // Redirect due to flash message
        });

        it("should prevent duplicate reviews from same user", async () => {
            const reviewData = {
                review: {
                    rating: 4,
                    comment: "Trying to review again",
                },
                author: testClient._id, // Same client who already reviewed
            };

            const res = await request(app)
                .post(`/api/reviews/${testLawyer._id}`)
                .set("Accept", "application/json")
                .send(reviewData);

            expect(res.statusCode).toBe(302); // Redirect due to flash message
        });

        it("should return error when lawyer not found", async () => {
            const reviewData = {
                review: {
                    rating: 5,
                    comment: "Review for non-existent lawyer",
                },
                author: testClient._id,
            };

            const res = await request(app)
                .post("/api/reviews/64b4c7fe12f84b1f12345678")
                .set("Accept", "application/json")
                .send(reviewData);

            expect(res.statusCode).toBe(302); // Redirect due to flash message
        });
    });

    describe("❌ Delete Review", () => {
        it("should allow author to delete their own review", async () => {
            const res = await request(app)
                .delete(`/api/reviews/${testLawyer._id}/${testReview._id}`)
                .set("Accept", "application/json")
                .send({ author: testClient._id });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.msg).toBe("Review deleted successfully");

            // Verify review was deleted from database
            const deletedReview = await Review.findById(testReview._id);
            expect(deletedReview).toBeNull();
        });

        it("should return error when review not found", async () => {
            const res = await request(app)
                .delete(`/api/reviews/${testLawyer._id}/64b4c7fe12f84b1f12345678`)
                .set("Accept", "application/json")
                .send({ author: testClient._id });

            expect(res.statusCode).toBe(302); // Redirect due to flash message
        });

        it("should prevent unauthorized user from deleting review", async () => {
            // First create a new review
            const newReview = await Review.create({
                lawyer: testLawyer._id,
                author: testClient._id,
                rating: 4,
                comment: "Another review for testing deletion",
            });

            // Try to delete with different user
            const anotherUser = await User.create({
                username: "anotheruser",
                email: "another@example.com",
                role: "user",
            });

            const res = await request(app)
                .delete(`/api/reviews/${testLawyer._id}/${newReview._id}`)
                .set("Accept", "application/json")
                .send({ author: anotherUser._id });

            expect(res.statusCode).toBe(302); // Redirect due to flash message

            // Verify review still exists
            const stillExists = await Review.findById(newReview._id);
            expect(stillExists).toBeTruthy();

            // Clean up
            await Review.findByIdAndDelete(newReview._id);
            await User.findByIdAndDelete(anotherUser._id);
        });
    });

    describe("🔍 Review Data Validation", () => {
        it("should validate rating range (1-5)", async () => {
            // Test with rating below minimum
            const invalidReviewLow = {
                review: {
                    rating: 0,
                    comment: "Invalid low rating",
                },
                author: testClient._id,
            };

            // Create another client for this test
            const anotherClient = await User.create({
                username: "anotherclient",
                email: "anotherclient@example.com",
                role: "user",
            });

            const res1 = await request(app)
                .post(`/api/reviews/${testLawyer._id}`)
                .set("Accept", "application/json")
                .send({ ...invalidReviewLow, author: anotherClient._id });

            // Should fail validation at model level or redirect
            expect([302, 500]).toContain(res1.statusCode);

            // Test with rating above maximum
            const invalidReviewHigh = {
                review: {
                    rating: 6,
                    comment: "Invalid high rating",
                },
                author: anotherClient._id,
            };

            const res2 = await request(app)
                .post(`/api/reviews/${testLawyer._id}`)
                .set("Accept", "application/json")
                .send(invalidReviewHigh);

            // Should fail validation at model level or redirect
            expect([302, 500]).toContain(res2.statusCode);

            // Clean up
            await User.findByIdAndDelete(anotherClient._id);
        });

        it("should handle valid rating range (1-5)", async () => {
            const validRatings = [1, 2, 3, 4, 5];

            for (let i = 0; i < validRatings.length; i++) {
                const rating = validRatings[i];

                // Create a new client for each rating test
                const client = await User.create({
                    username: `client${rating}`,
                    email: `client${rating}@example.com`,
                    role: "user",
                });

                const reviewData = {
                    review: {
                        rating: rating,
                        comment: `Review with rating ${rating}`,
                    },
                    author: client._id,
                };

                const res = await request(app)
                    .post(`/api/reviews/${testLawyer._id}`)
                    .set("Accept", "application/json")
                    .send(reviewData);

                expect(res.statusCode).toBe(201);
                expect(res.body.success).toBe(true);
                expect(res.body.data.rating).toBe(rating);

                // Clean up
                await Review.findByIdAndDelete(res.body.data._id);
                await User.findByIdAndDelete(client._id);
            }
        });
    });
});
