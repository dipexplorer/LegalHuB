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
const { isLoggedIn, ownChatRoom } = require("../middlewares/auth.middleware.js");

router.get("/", isLoggedIn, renderChatPage);
router.get("/rooms", isLoggedIn, getUserChatRooms);
router.get("/room/:appointmentId", isLoggedIn, getOrCreateChatRoom);
router.get("/lawyer/:lawyerId", isLoggedIn, getOrCreateChatRoomWithLawyer);
router.get("/messages/:chatRoomId", isLoggedIn, ownChatRoom, getMessages);

// NEW
router.delete("/messages/:messageId", isLoggedIn, deleteMessage);
router.delete("/room/:chatRoomId", isLoggedIn, ownChatRoom, deleteChatRoom);

module.exports = router;
