const http = require("http");
const { Server } = require("socket.io");
const app = require("./app.js");
const db_connect = require("./db/index.js");
const Message = require("./models/message.model");
const ChatRoom = require("./models/chatRoom.model");

// dotenv
require("dotenv").config();

const PORT = process.env.PORT || 8000;

// Create HTTP server with Express app
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:8000",
        credentials: true,
    },
});

// Attach io to app so it can be used in routes
app.set("io", io);

// Socket.IO connection
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("joinRoom", (roomId) => {
        socket.join(roomId);
        console.log(`Socket ${socket.id} joined room ${roomId}`);
    });

    socket.on("sendMessage", async (data) => {
        const { chatRoomId, senderId, receiverId, content } = data;
        try {
            const message = await Message.create({
                chatRoom: chatRoomId,
                sender: senderId,
                receiver: receiverId,
                content,
            });

            await ChatRoom.findByIdAndUpdate(chatRoomId, {
                lastMessage: content,
                updatedAt: new Date(),
            });

            io.to(chatRoomId).emit("newMessage", message);
        } catch (err) {
            console.error("Error sending message:", err);
            socket.emit("errorMessage", "Failed to send message.");
        }
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

// Connect to DB and start server
db_connect()
    .then(() => {
        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error("MongoDB connection error", err);
        process.exit(1);
    });
