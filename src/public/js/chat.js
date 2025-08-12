const socket = io();

let currentChatRoomId = null;
let currentUserId = "<%= user._id %>"; // Inject logged-in user id from your backend template
let currentParticipants = []; // store current participants for receiverId calculation

async function loadChatRooms() {
  const res = await fetch("/chat/rooms");
  const rooms = await res.json();

  const chatRoomsList = document.getElementById("chatRoomsList");
  chatRoomsList.innerHTML = "";

  rooms.forEach(room => {
    const btn = document.createElement("button");
    btn.textContent = `Appointment on ${new Date(room.appointment.date).toLocaleDateString()}`;
    btn.setAttribute("aria-label", `Chat room for appointment on ${new Date(room.appointment.date).toLocaleDateString()}`);
    btn.onclick = () => openChatRoom(room);
    chatRoomsList.appendChild(btn);
  });
}

async function openChatRoom(room) {
  currentChatRoomId = room._id;
  currentParticipants = room.participants;
  socket.emit("joinRoom", currentChatRoomId);

  // Highlight active button
  document.querySelectorAll("#chatRoomsList button").forEach(b => b.classList.remove("active"));
  event.target.classList.add("active");

  document.getElementById("chatWindow").style.display = "flex";

  // Load messages
  const res = await fetch(`/chat/messages/${currentChatRoomId}`);
  const messages = await res.json();

  const messagesContainer = document.getElementById("messagesContainer");
  messagesContainer.innerHTML = "";

  messages.forEach(msg => {
    addMessageToContainer(msg);
  });

  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function addMessageToContainer(msg) {
  const messagesContainer = document.getElementById("messagesContainer");
  const div = document.createElement("div");
  div.classList.add("message");
  div.classList.add(msg.sender === currentUserId ? "sent" : "received");
  div.textContent = msg.content;
  messagesContainer.appendChild(div);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

document.getElementById("messageForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("messageInput");
  const content = input.value.trim();
  if (!content || !currentChatRoomId) return;

  // Calculate receiverId as the other participant
  const receiverId = currentParticipants.find(id => id !== currentUserId);

  socket.emit("sendMessage", {
    chatRoomId: currentChatRoomId,
    senderId: currentUserId,
    receiverId,
    content
  });

  input.value = "";
});

// Listen for new messages from server
socket.on("newMessage", (msg) => {
  if (msg.chatRoom === currentChatRoomId) {
    addMessageToContainer(msg);
  }
});

window.onload = () => {
  loadChatRooms();
};
