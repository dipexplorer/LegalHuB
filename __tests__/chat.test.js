const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/user.model");
const LawyerProfile = require("../src/models/lawyer.model");
const Appointment = require("../src/models/appointment.model");
const ChatRoom = require("../src/models/chatRoom.model");
const Message = require("../src/models/message.model");

describe("💬 Chat API Testing", () => {
    let testClient;
    let testLawyer;
    let testLawyerProfile;
    let testAppointment;
    let testChatRoom;
    let testMessage;

    const mockClient = {
        username: "chatclient",
        name: "Chat Client",
        email: "chatclient@example.com",
        role: "user",
    };

    const mockLawyer = {
        username: "chatlawyer",
        name: "Chat Lawyer",
        email: "chatlawyer@example.com",
        role: "lawyer",
    };

    const mockLawyerProfile = {
        specialization: "Corporate Law",
        licenseNumber: "CORP123456",
        experience: 10,
        city: "Bangalore",
        state: "Karnataka",
        isVerified: true,
        isActive: true,
    };

    beforeAll(async () => {
        // Clean up existing data
        await Message.deleteMany({});
        await ChatRoom.deleteMany({});
        await Appointment.deleteMany({});
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

        // Create test appointment with unique card ID
        testAppointment = await Appointment.create({
            client: testClient._id,
            lawyer: testLawyer._id,
            date: new Date(Date.now() + 24 * 60 * 60 * 1000),
            timeSlot: "10:00 AM",
            status: "approved",
            notes: "Test appointment for chat",
            appointmentCard: {
                cardId: `chat-test-card-${Date.now()}`,
                qrCode: "test-qr-code",
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });

        // Create test chat room
        testChatRoom = await ChatRoom.create({
            participants: [testClient._id, testLawyer._id],
            appointment: testAppointment._id,
            lastMessage: "",
            lastMessageAt: null,
        });

        // Create test message
        testMessage = await Message.create({
            chatRoom: testChatRoom._id,
            sender: testClient._id,
            receiver: testLawyer._id,
            content: "Hello, I need legal advice",
            seen: false,
        });
    });

    afterAll(async () => {
        // Clean up test data
        await Message.deleteMany({});
        await ChatRoom.deleteMany({});
        await Appointment.deleteMany({});
        await LawyerProfile.deleteMany({});
        await User.deleteMany({});
    });

    describe("🏠 Get or Create Chat Room", () => {
        it("should redirect to existing chat room for appointment", async () => {
            const res = await request(app)
                .get(`/chat/room/${testAppointment._id}`)
                .set("Accept", "application/json")
                .send({ author: testClient._id });

            expect(res.statusCode).toBe(302); // Redirect
            expect(res.headers.location).toContain(`/chat?roomId=${testChatRoom._id}`);
        });

        it("should return 404 for non-existent appointment", async () => {
            const res = await request(app)
                .get("/chat/room/64b4c7fe12f84b1f12345678")
                .set("Accept", "application/json")
                .send({ author: testClient._id });

            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.msg).toBe("Appointment not found");
        });

        it("should return 403 for unauthorized user", async () => {
            const unauthorizedUser = await User.create({
                username: "unauthorized",
                email: "unauthorized@example.com",
                role: "user",
            });

            const res = await request(app)
                .get(`/chat/room/${testAppointment._id}`)
                .set("Accept", "application/json")
                .send({ author: unauthorizedUser._id });

            expect(res.statusCode).toBe(403);
            expect(res.body.success).toBe(false);
            expect(res.body.msg).toBe("Unauthorized");

            // Clean up
            await User.findByIdAndDelete(unauthorizedUser._id);
        });
    });

    describe("📋 Get User Chat Rooms", () => {
        it("should fetch chat rooms for authenticated user", async () => {
            const res = await request(app)
                .get("/chat/rooms")
                .set("Accept", "application/json")
                .send({ author: testClient._id });

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);

            const chatRoom = res.body[0];
            expect(chatRoom).toHaveProperty("participants");
            expect(chatRoom).toHaveProperty("appointment");
            expect(chatRoom.participants).toHaveLength(2);
        });

        it("should return 302 redirect for unauthenticated user", async () => {
            const res = await request(app).get("/chat/rooms").set("Accept", "application/json");

            expect(res.statusCode).toBe(302); // Redirect to login
        });
    });

    describe("💬 Get Messages", () => {
        it("should fetch messages for authorized participant", async () => {
            const res = await request(app)
                .get(`/chat/messages/${testChatRoom._id}`)
                .set("Accept", "application/json")
                .send({ author: testClient._id });

            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);

            const message = res.body[0];
            expect(message).toHaveProperty("content");
            expect(message).toHaveProperty("sender");
            expect(message).toHaveProperty("receiver");
            expect(message.content).toBe("Hello, I need legal advice");
        });

        it("should return 404 for non-existent chat room", async () => {
            const res = await request(app)
                .get("/chat/messages/64b4c7fe12f84b1f12345678")
                .set("Accept", "application/json")
                .send({ author: testClient._id });

            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.msg).toBe("Chat room not found");
        });

        it("should return 403 for unauthorized user", async () => {
            const unauthorizedUser = await User.create({
                username: "unauthorized2",
                email: "unauthorized2@example.com",
                role: "user",
            });

            const res = await request(app)
                .get(`/chat/messages/${testChatRoom._id}`)
                .set("Accept", "application/json")
                .send({ author: unauthorizedUser._id });

            expect(res.statusCode).toBe(403);
            expect(res.body.success).toBe(false);
            expect(res.body.msg).toBe("You do not have access to this chat room");

            // Clean up
            await User.findByIdAndDelete(unauthorizedUser._id);
        });
    });

    describe("🗑️ Delete Message", () => {
        it("should mark message as deleted for authorized user", async () => {
            const res = await request(app)
                .delete(`/chat/messages/${testMessage._id}`)
                .set("Accept", "application/json")
                .send({ author: testClient._id });

            expect(res.statusCode).toBe(200);
            expect(res.body.ok).toBe(true);
            expect(res.body.messageId).toBe(testMessage._id.toString());

            // Verify message is marked as deleted
            const deletedMessage = await Message.findById(testMessage._id);
            expect(deletedMessage.deleted).toBe(true);
            expect(deletedMessage.deletedAt).toBeTruthy();
        });

        it("should return 404 for non-existent message", async () => {
            const res = await request(app)
                .delete("/chat/messages/64b4c7fe12f84b1f12345678")
                .set("Accept", "application/json")
                .send({ author: testClient._id });

            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.msg).toBe("Message not found");
        });

        it("should return 400 when trying to delete already deleted message", async () => {
            // Create a new message for this test
            const newMessage = await Message.create({
                chatRoom: testChatRoom._id,
                sender: testLawyer._id,
                receiver: testClient._id,
                content: "Test message for deletion",
                deleted: true, // Already deleted
                deletedAt: new Date(),
            });

            const res = await request(app)
                .delete(`/chat/messages/${newMessage._id}`)
                .set("Accept", "application/json")
                .send({ author: testLawyer._id });

            expect(res.statusCode).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.msg).toBe("Message is already deleted");

            // Clean up
            await Message.findByIdAndDelete(newMessage._id);
        });

        it("should return 403 for unauthorized user", async () => {
            const newMessage = await Message.create({
                chatRoom: testChatRoom._id,
                sender: testLawyer._id,
                receiver: testClient._id,
                content: "Test message for unauthorized deletion",
            });

            const unauthorizedUser = await User.create({
                username: "unauthorized3",
                email: "unauthorized3@example.com",
                role: "user",
            });

            const res = await request(app)
                .delete(`/chat/messages/${newMessage._id}`)
                .set("Accept", "application/json")
                .send({ author: unauthorizedUser._id });

            expect(res.statusCode).toBe(403);
            expect(res.body.success).toBe(false);
            expect(res.body.msg).toBe("Unauthorized");

            // Clean up
            await Message.findByIdAndDelete(newMessage._id);
            await User.findByIdAndDelete(unauthorizedUser._id);
        });
    });

    describe("🗑️ Delete Chat Room", () => {
        it("should delete entire chat room for authorized participant", async () => {
            // Create a new chat room for this test
            const newAppointment = await Appointment.create({
                client: testClient._id,
                lawyer: testLawyer._id,
                date: new Date(Date.now() + 48 * 60 * 60 * 1000),
                timeSlot: "2:00 PM",
                status: "approved",
            });

            const newChatRoom = await ChatRoom.create({
                participants: [testClient._id, testLawyer._id],
                appointment: newAppointment._id,
                lastMessage: "Test room for deletion",
            });

            const res = await request(app)
                .delete(`/chat/room/${newChatRoom._id}`)
                .set("Accept", "application/json")
                .send({ author: testClient._id });

            expect(res.statusCode).toBe(200);
            expect(res.body.ok).toBe(true);

            // Verify chat room is deleted
            const deletedRoom = await ChatRoom.findById(newChatRoom._id);
            expect(deletedRoom).toBeNull();

            // Clean up
            await Appointment.findByIdAndDelete(newAppointment._id);
        });

        it("should return 404 for non-existent chat room", async () => {
            const res = await request(app)
                .delete("/chat/room/64b4c7fe12f84b1f12345678")
                .set("Accept", "application/json")
                .send({ author: testClient._id });

            expect(res.statusCode).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.msg).toBe("Chat room not found");
        });

        it("should return 403 for unauthorized user", async () => {
            const unauthorizedUser = await User.create({
                username: "unauthorized4",
                email: "unauthorized4@example.com",
                role: "user",
            });

            const res = await request(app)
                .delete(`/chat/room/${testChatRoom._id}`)
                .set("Accept", "application/json")
                .send({ author: unauthorizedUser._id });

            expect(res.statusCode).toBe(403);
            expect(res.body.success).toBe(false);
            expect(res.body.msg).toBe("You do not have access to this chat room");

            // Clean up
            await User.findByIdAndDelete(unauthorizedUser._id);
        });
    });

    describe("🏠 Get or Create Chat Room with Lawyer", () => {
        it("should redirect to chat room when appointment exists", async () => {
            const res = await request(app)
                .get(`/chat/lawyer/${testLawyer._id}`)
                .set("Accept", "application/json")
                .send({ author: testClient._id });

            expect(res.statusCode).toBe(302); // Redirect
            expect(res.headers.location).toContain("/chat?roomId=");
        });

        it("should redirect with error when no appointment exists", async () => {
            const anotherLawyer = await User.create({
                username: "anotherlawyer",
                email: "anotherlawyer@example.com",
                role: "lawyer",
            });

            const res = await request(app)
                .get(`/chat/lawyer/${anotherLawyer._id}`)
                .set("Accept", "application/json")
                .send({ author: testClient._id });

            expect(res.statusCode).toBe(302); // Redirect
            expect(res.headers.location).toContain(`/lawyers/${anotherLawyer._id}`);

            // Clean up
            await User.findByIdAndDelete(anotherLawyer._id);
        });
    });
});
