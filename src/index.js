const http = require("http");
const { Server } = require("socket.io");
const app = require("./app.js");
const db_connect = require("./db/index.js");
require("dotenv").config();

const PORT = process.env.PORT || 8000;

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:8000",
        credentials: true,
    },
});

app.set("io", io);

// Import socket logic
require("./socket")(io);

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
