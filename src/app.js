if (process.env.NODE_ENV != "production") {
    require("dotenv").config(); // Load environment variables
}

// IMPORTANT: `express-async-errors` lets async errors bubble to express error handler
require("express-async-errors");

const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const cookieParser = require("cookie-parser");


// Security + utilities
const helmet = require("helmet");
const hpp = require("hpp");
const compression = require("compression");
const morgan = require("morgan");
const mongoSanitize = require("express-mongo-sanitize");
const xssClean = require("xss-clean");

// Passport Configuration
const passport = require("passport");
const LocalStrategy = require("passport-local");

const GoogleStrategy = require("passport-google-oauth20").Strategy;

// Import User model (Fix for passport authentication)
const User = require("./models/user.model.js");
const Notification = require("./models/notification.model.js");

// Import Utility Functions
const apiError = require("./utils/apiError.js");
const apiResponse = require("./utils/apiResponse.js");

// Rate Limiter
const apiLimiter = require("./middlewares/rateLimiter.middleware.js");

// Basic security & middleware (top)
const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PROD = NODE_ENV === "production";
const IS_TEST = NODE_ENV === "test";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:8000";

// ✅ Render ke proxy ko trust karo (production me)
if (IS_PROD) {
    app.set("trust proxy", 1);
}

// Security headers
helmet({
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            "default-src": ["'self'"],
            "img-src": ["'self'", "data:", "https:"],
            "script-src": [
                "'self'",
                "'unsafe-inline'",
                "https://cdn.jsdelivr.net",
                "https://cdn.gtranslate.net",
                "https://www.chatbase.co",
            ],
            "script-src-attr": ["'unsafe-inline'"], // ✅ allow onclick etc.
            "script-src-elem": ["'self'", "'unsafe-inline'"], // ✅ allow inline <script>
            "style-src": [
                "'self'",
                "'unsafe-inline'",
                "https://cdnjs.cloudflare.com",
                "https://cdn.jsdelivr.net",
            ],
            "font-src": ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
            "connect-src": ["'self'", "https://www.chatbase.co", "wss://www.chatbase.co"],
            "frame-src": ["'self'", "https://www.chatbase.co"],
        },
    },
});

// Prevent HTTP Parameter Pollution
app.use(hpp());

// sanitize req.body, req.query, req.params to prevent NoSQL injection
app.use(mongoSanitize());

// simple XSS cleaning of user input
app.use(xssClean());

// compress responses
app.use(compression());

// request logging
if (!IS_TEST) {
    app.use(morgan(IS_PROD ? "combined" : "dev"));
}
// // CORS (strict origin check)
// app.use(
//     cors({
//         origin: (origin, callback) => {
//             // allow tools like curl/postman (no origin)
//             if (!origin) return callback(null, true);
//             if (origin === CORS_ORIGIN) return callback(null, true);
//             return callback(new Error("CORS not allowed from this origin"), false);
//         },
//         credentials: true,
//         methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
//     })
// );


// CORS Configuration
app.use(
    cors({
        origin: process.env.CORS_ORIGIN || "http://localhost:8000",
        credentials: true,
    })
);

// Middleware Setup (✅ Moved to the top)
// Body parsers with safe limits
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Cookies
app.use(cookieParser());

// Static files
app.use(express.static(path.join(__dirname, "/public")));
app.use(methodOverride("_method"));

// ------------------------- View engine -------------------------
app.engine("ejs", ejsMate);
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// ------------------------- Session -------------------------
const sessionOptions = {
    name: process.env.SESSION_NAME || "sid",
    secret: process.env.SESSION_SECRET || "mysecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: IS_PROD, // set true in production (requires https)
        sameSite: IS_PROD ? "none" : "lax", // if using cross-site cookies in prod set 'none' and secure
        // domain: process.env.SESSION_COOKIE_DOMAIN || undefined, // optional
    },
};

// Only attach store when not in test env to avoid Jest open handle issues
if (!IS_TEST) {
    sessionOptions.store = MongoStore.create({
        mongoUrl: process.env.DB_URL || process.env.MONGODB_URI,
        collectionName: "sessions",
        ttl: 7 * 24 * 60 * 60, // 7 days
    });
}

app.use(session(sessionOptions));
app.use(flash());

// Passport
app.use(passport.initialize());
app.use(passport.session());

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                let user = await User.findOne({ googleId: profile.id });

                if (!user) {
                    user = await User.create({
                        googleId: profile.id,
                        username: profile.emails[0].value,
                        email: profile.emails[0].value,
                        name: profile.displayName,
                        profilePic: profile.photos[0]?.value,
                    });
                }
                return done(null, user);
            } catch (err) {
                return done(err, null);
            }
        }
    )
);

// ------------------------- Google OAuth Routes -------------------------
app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login", failureFlash: true }),
    (req, res) => {
        // Successful login
        res.redirect("/");
    }
);

// Global locals
app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currentUser = req.user || null;
    next();
});

// Middleware to attach notifications to all responses
app.use(async (req, res, next) => {
    if (req.user) {
        const notifications = await Notification.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(5);

        const unreadCount = await Notification.countDocuments({
            user: req.user._id,
            status: "unread",
        });

        res.locals.notifications = notifications;
        res.locals.notificationsCount = unreadCount;
    } else {
        res.locals.notifications = [];
        res.locals.notificationsCount = 0;
    }
    next();
});

// Import routes
const healthCheckRouter = require("./routes/healthCheck_route.js");
const dictionaryRoutes = require("./routes/dictionary.routes.js");
const rightsRoutes = require("./routes/rights.routes.js");
const documentsRoutes = require("./routes/document.routes.js");
const { smartSearch } = require("./controllers/search.controller.js");
const articleRoutes = require("./routes/article.routes.js");
const userRoutes = require("./routes/user.routes.js");
const pageRoutes = require("./routes/page.routes.js");
const lawyerRoutes = require("./routes/lawyer.routes.js");
const appointmentRoutes = require("./routes/appointment.routes.js");
const chatRoutes = require("./routes/chat.routes.js");
const reviewRoutes = require("./routes/review.routes.js");
const adminRoutes = require("./routes/admin.routes.js");
const notificationRoutes = require("./routes/notification.routes.js");

// Rate-limiter applied to /api (keeps it at top)
app.use("/api", apiLimiter);

// API and page routes
app.use("/", pageRoutes);
app.use("/api/healthcheck", healthCheckRouter);
app.use("/api/dictionary", dictionaryRoutes);
app.use("/api/rights", rightsRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/articles", articleRoutes);
app.use("/api/users", userRoutes);
app.use("/api/lawyers", lawyerRoutes);
app.use("/api/appointment", appointmentRoutes);
app.use("/chat", chatRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);

// Smart Search
app.get("/api/search", smartSearch);

// 404 handler for HTML or API
app.all("*", (req, res) => {
    // if request accepts html render page, else return json
    if (req.accepts("html")) {
        return res.status(404).render("pages/nopage");
    }
    return res.status(404).json(new apiResponse(404, null, "Not Found"));
});

// ------------------------- Global Error Handler -------------------------
app.use((err, req, res, next) => {
    const isProd = IS_PROD;
    const isTest = IS_TEST;

    // log for developers
    if (!isProd && !isTest) {
        if (err.name === "apiError" || err instanceof apiError) {
            console.error(`❌ ${err.message} [${err.statusCode}]`);
        } else {
            console.error("🔥 Unexpected Error:", err);
        }
    }

    const statusCode = err.statusCode || 500;
    // If request expects HTML, render an error page (friendly)
    if (req.accepts("html")) {
        // In production avoid exposing stack traces
        return res.status(statusCode).render("pages/error", {
            statusCode,
            msg: isProd ? "Internal Server Error" : err.message,
            status: statusCode,
            stack: isProd ? null : err.stack,
        });
    }

    // Default: send structured JSON API response
    return res
        .status(statusCode)
        .json(new apiResponse(statusCode, null, err.message || "Internal Server Error"));
});

// ------------------------- DB connect + graceful shutdown -------------------------
let serverInstance = null;

// Simple connect function using mongoose - throws on failure
async function connectDBAndStart(appPort) {
    const uri = process.env.DB_URL;
    if (!uri) {
        throw new Error("MONGODB connection URI is not defined in environment (DB_URL)");
    }

    try {
        // mongoose.connect will throw if it cannot connect
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
        console.log("✅ MongoDB connected");

        // expose dbClose for graceful shutdown
        global.dbClose = async () => {
            try {
                await mongoose.disconnect();
                console.log("✅ MongoDB disconnected");
            } catch (err) {
                console.warn("⚠️ Error while disconnecting MongoDB:", err);
            }
        };

        // start server after DB connected
        serverInstance = app.listen(appPort, () => {
            console.log(`🚀 Server running at http://localhost:${appPort} [${NODE_ENV}]`);
        });
    } catch (err) {
        console.error("❌ MongoDB connection error:", err);
        // rethrow to be handled by caller
        throw err;
    }
}

// graceful shutdown
let shuttingDown = false;
async function gracefulShutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);

    // close HTTP server if running
    if (serverInstance && serverInstance.listening) {
        await new Promise((resolve) => serverInstance.close(resolve));
        console.log("✅ HTTP server closed");
    }

    // close DB if available
    try {
        if (typeof global.dbClose === "function") {
            await global.dbClose();
        }
    } catch (err) {
        console.warn("⚠️ Error closing DB:", err);
    }

    console.log("✅ Graceful shutdown complete.");
    // ensure exit
    process.exit(0);
}

// handle signals
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

// convenience start function used by server runner
async function startServer(port = process.env.PORT || 3000) {
    try {
        await connectDBAndStart(port);
    } catch (err) {
        console.error("Failed to start server:", err);
        // run graceful shutdown to use the same cleanup path
        await gracefulShutdown("startupFailure");
    }
}

// if this file is run directly, start the server.
// If required as module (tests), exports `app` and `startServer()`
if (require.main === module) {
    startServer(process.env.PORT || 3000);
}

module.exports = app;
module.exports.startServer = startServer; // still export startServer separately
