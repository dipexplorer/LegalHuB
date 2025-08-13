const ChatRoom = require("../models/chatRoom.model.js");
const Message = require("../models/message.model.js");
const Appointment = require("../models/appointment.model.js");
const asyncHandler = require("../utils/asyncHandler.js");
const apiError = require("../utils/apiError.js");

// Get or create chat room for appointment
const getOrCreateChatRoom = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { appointmentId } = req.params;

    const appointment = await Appointment.findById(appointmentId).populate("client lawyer");
    if (!appointment) {
        throw new apiError(404, "Appointment not found");
    }

    if (
        ![appointment.client._id.toString(), appointment.lawyer._id.toString()].includes(
            userId.toString()
        )
    ) {
        throw new apiError(403, "Unauthorized");
    }

    let chatRoom = await ChatRoom.findOne({
        appointment: appointmentId,
        participants: {
            $all: [appointment.client._id, appointment.lawyer._id],
        },
    });

    if (!chatRoom) {
        chatRoom = await ChatRoom.create({
            participants: [appointment.client._id, appointment.lawyer._id],
            appointment: appointmentId,
            lastMessage: "",
            lastMessageAt: null,
        });
    }

    return res.redirect(`/chat?roomId=${chatRoom._id}`);
});

// Get chat rooms for logged-in user
const getUserChatRooms = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    if (!userId) {
        throw new apiError(401, "Not authenticated");
    }

    const chatRooms = await ChatRoom.find({ participants: userId })
        .sort({ updatedAt: -1 })
        .populate({
            path: "participants",
            select: "username name",
        })
        .populate({
            path: "appointment",
            select: "date status",
        });
    res.json(chatRooms);
});

// Get messages for a chat room
const getMessages = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { chatRoomId } = req.params;

    const chatRoom = await ChatRoom.findById(chatRoomId);
    if (!chatRoom) {
        throw new apiError(404, "Chat room not found");
    }

    if (!chatRoom.participants.some((p) => p.toString() === userId.toString())) {
        throw new apiError(403, "Unauthorized");
    }

    const messages = await Message.find({ chatRoom: chatRoomId })
        .sort({ createdAt: 1 })
        .populate("sender", "username name")
        .populate("receiver", "username name");

    res.json(messages);
});

// Delete a single message
const deleteMessage = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { messageId } = req.params;

    const msg = await Message.findById(messageId);
    if (!msg) {
        throw new apiError(404, "Message not found");
    }

    const room = await ChatRoom.findById(msg.chatRoom);
    if (!room) {
        throw new apiError(404, "Chat room not found");
    }

    const isParticipant = room.participants.some((p) => p.toString() === userId.toString());
    if (!isParticipant) {
        throw new apiError(403, "Unauthorized");
    }

    await Message.findByIdAndDelete(messageId);

    const last = await Message.find({ chatRoom: room._id }).sort({ createdAt: -1 }).limit(1);
    if (!last.length) {
        await ChatRoom.findByIdAndUpdate(room._id, {
            $set: {
                lastMessage: "",
                lastMessageAt: null,
                lastMessageSender: null,
            },
        });
    } else {
        await ChatRoom.findByIdAndUpdate(room._id, {
            $set: {
                lastMessage: last[0].content,
                lastMessageAt: last[0].createdAt,
                lastMessageSender: last[0].sender,
            },
        });
    }

    return res.json({ ok: true });
});

// Delete an entire chat room
const deleteChatRoom = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { chatRoomId } = req.params;

    const room = await ChatRoom.findById(chatRoomId);
    if (!room) {
        throw new apiError(404, "Chat room not found");
    }

    const isParticipant = room.participants.some((p) => p.toString() === userId.toString());
    if (!isParticipant) {
        throw new apiError(403, "Unauthorized");
    }

    await Message.deleteMany({ chatRoom: chatRoomId });
    await ChatRoom.findByIdAndDelete(chatRoomId);

    return res.json({ ok: true });
});

// Render chat page
const renderChatPage = asyncHandler(async (req, res) => {
    const { roomId } = req.query;
    res.render("pages/chat", { user: req.user, roomId });
});

// Get or create chat room with a lawyer directly
const getOrCreateChatRoomWithLawyer = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { lawyerId } = req.params;

    // Check if user is a client and has a confirmed booking with this lawyer
    const appointment = await Appointment.findOne({
        client: userId,
        lawyer: lawyerId,
    });

    if (!appointment) {
        req.flash("error", "You must have a confirmed booking to chat with this lawyer.");
        return res.redirect("/lawyers/" + lawyerId);
    }

    let chatRoom = await ChatRoom.findOne({
        appointment: appointment._id,
        participants: { $all: [userId, lawyerId] },
    });

    if (!chatRoom) {
        chatRoom = await ChatRoom.create({
            participants: [userId, lawyerId],
            appointment: appointment._id,
            lastMessage: "",
        });
    }
    req.flash("success", "Chat room created successfully");
    res.redirect(`/chat?roomId=${chatRoom._id}`);
});

module.exports = {
    getOrCreateChatRoom,
    getUserChatRooms,
    getMessages,
    renderChatPage,
    getOrCreateChatRoomWithLawyer,
    deleteMessage,
    deleteChatRoom,
};
