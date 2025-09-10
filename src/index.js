// src/index.js — robust starter (works with either app export style)
const http = require("http");
const os = require("os");
const { Server } = require("socket.io");
require("dotenv").config();
const passport = require("./config/passport");


// Try to require app module in a safe way that works for both:
// 1) module.exports = app
// 2) module.exports = { app, startServer }
let appModule;
try {
    appModule = require("./app.js");
} catch (err) {
    console.error("❌ Failed to require ./app.js:", err);
    process.exit(1);
}

// Resolve the Express app instance robustly
const app = appModule && (appModule.app || appModule);
if (!app || typeof app.set !== "function") {
    console.error("❌ The required app module did not export an Express app.");
    console.error("Export styles supported:");
    console.error("  - module.exports = app;");
    console.error("  - module.exports = { app, startServer };");
    console.error("Value returned from require('./app.js'):", appModule);
    process.exit(1);
}

// DB connect function (existing db connector)
const db_connect = require("./db/index.js");

const PORT = Number(process.env.PORT) || 8000;
const NODE_ENV = process.env.NODE_ENV || "development";

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:8000",
        credentials: true,
    },
});

// attach io to app (so other modules can access it)
app.set("io", io);

app.use(passport.initialize());
app.use(passport.session());

// import socket logic (if it expects io)
try {
    require("./socket")(io);
} catch (err) {
    // Not fatal if socket module missing — log and continue
    console.warn(
        "⚠️ Could not initialize sockets (require('./socket') failed):",
        err.message || err
    );
}

// helper: LAN IPs
function getLanIPs() {
    const nets = os.networkInterfaces();
    const results = [];
    Object.keys(nets).forEach((name) => {
        for (const net of nets[name]) {
            if (net.family === "IPv4" && !net.internal) {
                results.push(net.address);
            }
        }
    });
    return results;
}

function maskDbUrl(url) {
    if (!url) return "<not set>";
    try {
        const withoutProto = url.replace(/^mongodb(\+srv)?:\/\//i, "");
        const atIdx = withoutProto.indexOf("@");
        if (atIdx > -1) {
            return "mongodb://<REDACTED>@" + withoutProto.slice(atIdx + 1);
        }
        return url;
    } catch {
        return "<invalid db url>";
    }
}

// Start the server only after DB connects
db_connect()
    .then(() => {
        server.listen(PORT, () => {
            const localUrl = `http://localhost:${PORT}`;
            const lanIps = getLanIPs();
            const dbUrl = process.env.DB_URL || process.env.MONGODB_URI || "";
            const maskedDb = maskDbUrl(dbUrl);

            console.log(`\n🚀 Server started`);
            console.log(`   Environment : ${NODE_ENV}`);
            console.log(`   Local URL   : ${localUrl}`);
            if (lanIps.length) {
                lanIps.forEach((ip) => console.log(`   LAN URL     : http://${ip}:${PORT}`));
            }
            console.log(`   Port        : ${PORT}`);
            console.log(`   DB host     : ${maskedDb}`);
            console.log(`   CORS origin : ${process.env.CORS_ORIGIN || "not set"}\n`);
        });
    })
    .catch((err) => {
        console.error("MongoDB connection error", err);
        // exit nonzero — keep behavior consistent with earlier design
        process.exit(1);
    });

// graceful shutdown (in case you want to handle it here too)
async function gracefulShutdown(signal) {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    try {
        // close server if running
        if (server.listening) {
            await new Promise((resolve) => server.close(resolve));
            console.log("✅ HTTP server closed");
        }
    } catch (err) {
        console.warn("⚠️ Error closing HTTP server:", err);
    }

    try {
        if (typeof global.dbClose === "function") {
            await global.dbClose();
            console.log("✅ MongoDB disconnected");
        }
    } catch (err) {
        console.warn("⚠️ Error closing DB:", err);
    }

    console.log("✅ Graceful shutdown complete.");
    process.exit(0);
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("uncaughtException", (err) => {
    console.error("❌ Uncaught exception:", err);
    gracefulShutdown("uncaughtException");
});
process.on("unhandledRejection", (reason) => {
    console.error("❌ Unhandled Rejection:", reason);
    gracefulShutdown("unhandledRejection");
});
