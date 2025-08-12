const express = require("express");
const router = express.Router();
const {
  getOrCreateChatRoom,
  getUserChatRooms,
  getMessages
} = require("../controllers/chat.controller");

router.get("/rooms", getUserChatRooms); // list all chat rooms for user
router.get("/room/:appointmentId", getOrCreateChatRoom); // get or create chat room by appointment
router.get("/messages/:chatRoomId", getMessages);

module.exports = router;
