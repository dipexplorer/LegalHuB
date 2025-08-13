const express = require("express");
const router = express.Router();
const {
  getOrCreateChatRoom,
  getUserChatRooms,
  getMessages,
  renderChatPage,
  getOrCreateChatRoomWithLawyer,
  deleteMessage,
  deleteChatRoom,
} = require("../controllers/chat.controller");

// Auth middleware example
const isAuthenticated = (req, res, next) => {
  if (!req.user) return res.status(401).json({ msg: "Not authenticated" });
  next();
};

router.get("/", isAuthenticated, renderChatPage);
router.get("/rooms", isAuthenticated, getUserChatRooms);
router.get("/room/:appointmentId", isAuthenticated, getOrCreateChatRoom);
router.get("/lawyer/:lawyerId", isAuthenticated, getOrCreateChatRoomWithLawyer);
router.get("/messages/:chatRoomId", isAuthenticated, getMessages);

// NEW
router.delete("/messages/:messageId", isAuthenticated, deleteMessage);
router.delete("/room/:chatRoomId", isAuthenticated, deleteChatRoom);

module.exports = router;
