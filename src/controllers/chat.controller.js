const ChatRoom = require("../models/chatRoom.model.js");
const Message = require("../models/message.model.js");
const Appointment = require("../models/appointment.model.js");
const asyncHandler = require("../utils/asyncHandler.js");
const apiResponse = require("../utils/apiResponse.js");
const apiError = require("../utils/apiError.js");

// Get or create chat room for appointment
exports.getOrCreateChatRoom = async (req, res) => {
  try {
    const userId = req.user._id;
    const { appointmentId } = req.params;

    const appointment = await Appointment.findById(appointmentId).populate("client lawyer");
    if (!appointment) return res.status(404).json({ msg: "Appointment not found" });

    // Authorization check: user must be either client or lawyer on this appointment
    if (![appointment.client._id.toString(), appointment.lawyer._id.toString()].includes(userId.toString())) {
      return res.status(403).json({ msg: "Unauthorized" });
    }

    let chatRoom = await ChatRoom.findOne({
      appointment: appointmentId,
      participants: { $all: [appointment.client._id, appointment.lawyer._id] }
    });

    if (!chatRoom) {
      chatRoom = await ChatRoom.create({
        participants: [appointment.client._id, appointment.lawyer._id],
        appointment: appointmentId,
        lastMessage: "",
      });
    }

    res.json(chatRoom);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Get chat rooms for logged-in user
exports.getUserChatRooms = async (req, res) => {
  try {
    const userId = req.user._id;

    const chatRooms = await ChatRoom.find({ participants: userId })
      .populate({
        path: "participants",
        select: "username name",
      })
      .populate({
        path: "appointment",
        select: "date status",
      })
      .sort({ updatedAt: -1 });

    res.json(chatRooms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};

// Get messages for a chat room
exports.getMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const { chatRoomId } = req.params;

    // Validate user is a participant of chat room
    const chatRoom = await ChatRoom.findById(chatRoomId);
    if (!chatRoom) return res.status(404).json({ msg: "Chat room not found" });

    if (!chatRoom.participants.some(p => p.toString() === userId.toString())) {
      return res.status(403).json({ msg: "Unauthorized" });
    }

    const messages = await Message.find({ chatRoom: chatRoomId }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
};