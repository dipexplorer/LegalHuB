const ChatRoom = require("./models/chatRoom.model");
const Message = require("./models/message.model");

module.exports = function (io) {
    io.on("connection", (socket) => {
        console.log("User connected:", socket.id);

        // Join a chat room
        socket.on("joinRoom", (chatRoomId) => {
            socket.join(String(chatRoomId));
            console.log(`Socket ${socket.id} joined room ${chatRoomId}`);
        });

        // Typing indicator
        socket.on("typing", ({ chatRoomId, userId }) => {
            socket.to(String(chatRoomId)).emit("typing", userId);
        });

        socket.on("stopTyping", ({ chatRoomId, userId }) => {
            socket.to(String(chatRoomId)).emit("stopTyping", userId);
        });

        // Send message
        socket.on(
            "sendMessage",
            async ({ chatRoomId, senderId, receiverId, content }, callback) => {
                try {
                    if (!content || !chatRoomId || !senderId) {
                        return callback?.({
                            status: "error",
                            msg: "Missing fields",
                        });
                    }

                    // If no receiverId provided, find it from chat room participants
                    if (!receiverId) {
                        const room = await ChatRoom.findById(chatRoomId).select("participants");
                        if (room) {
                            receiverId = room.participants.find(
                                (id) => id.toString() !== senderId.toString()
                            );
                        }
                    }

                    const message = await Message.create({
                        chatRoom: chatRoomId,
                        sender: senderId,
                        receiver: receiverId || null,
                        content,
                        seen: false,
                    });

                    await ChatRoom.findByIdAndUpdate(chatRoomId, {
                        $set: {
                            lastMessage: content,
                            lastMessageAt: new Date(),
                            lastMessageSender: senderId,
                        },
                    });

                    const populated = await Message.findById(message._id)
                        .populate("sender", "username name")
                        .populate("receiver", "username name");

                    io.to(String(chatRoomId)).emit("newMessage", populated);
                    callback?.({ status: "ok", message: populated });
                } catch (err) {
                    console.error("sendMessage error:", err);
                    callback?.({ status: "error", msg: "Server error" });
                }
            }
        );

        // Mark all messages as seen
        socket.on("markSeen", async ({ chatRoomId, userId }) => {
            try {
                await Message.updateMany(
                    { chatRoom: chatRoomId, sender: { $ne: userId }, seen: false },
                    { $set: { seen: true } }
                );
                io.to(String(chatRoomId)).emit("messagesSeen", {
                    chatRoomId,
                    userId,
                });
            } catch (err) {
                console.error("markSeen error:", err);
            }
        });

        // Delete message
        socket.on("deleteMessage", async ({ messageId, chatRoomId }) => {
            try {
                await Message.findByIdAndDelete(messageId);
                io.to(String(chatRoomId)).emit("messageDeleted", messageId);
            } catch (err) {
                console.error("deleteMessage error:", err);
            }
        });

        // Delete whole chat
        socket.on("deleteChat", async (chatRoomId) => {
            try {
                await Message.deleteMany({ chatRoom: chatRoomId });
                await ChatRoom.findByIdAndDelete(chatRoomId);
                io.emit("chatDeleted", chatRoomId);
            } catch (err) {
                console.error("deleteChat error:", err);
            }
        });

        socket.on("disconnect", () => {
            console.log("User disconnected:", socket.id);
        });
    });
};
