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
// const LocalStrategy = require("passport-local");
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
app.use(
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
                "script-src-elem": [
                    "'self'", 
                    "'unsafe-inline'", 
                    "https://cdn.jsdelivr.net",
                    "https://cdn.gtranslate.net",
                    "https://www.chatbase.co"
                ], // ✅ allow inline <script>
                "style-src": [
                    "'self'",
                    "'unsafe-inline'",
                    "https://cdnjs.cloudflare.com",
                    "https://cdn.jsdelivr.net",
                    "https://fonts.googleapis.com",
                ],
                "font-src": [
                    "'self'", 
                    "https://cdnjs.cloudflare.com", 
                    "https://cdn.jsdelivr.net",
                    "https://fonts.gstatic.com"
                ],
                "connect-src": [
                    "'self'", 
                    "https://www.chatbase.co", 
                    "wss://www.chatbase.co",
                    "https://cdn.jsdelivr.net"
                ],
                "frame-src": ["'self'", "https://www.chatbase.co"],
            },
        },
    })
);

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
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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

// Global locals
app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currentUser = req.user || null;
    next();
});

// Middleware to attach notifications to all responses
app.use(async (req, res, next) => {
    if (!req.user || !req.accepts("html")) {
        res.locals.notifications = [];
        res.locals.notificationsCount = 0;
        return next();
    }
    try {
        const notifications = await Notification.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(5);
        const unreadCount = await Notification.countDocuments({
            user: req.user._id,
            status: "unread",
        });
        res.locals.notifications = notifications;
        res.locals.notificationsCount = unreadCount;
    } catch (err) {
        console.warn("Notifications middleware error:", err);
        res.locals.notifications = [];
        res.locals.notificationsCount = 0;
    }
    next();
});

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
                    // Check if a user with this email already exists (registered with local auth)
                    const existingUser = await User.findOne({ email: profile.emails[0].value });

                    if (existingUser) {
                        // Link the Google account to this user
                        existingUser.googleId = profile.id;

                        if (!existingUser.profilePicture) {
                            existingUser.profilePicture = profile.photos[0]?.value || undefined; // undefined will trigger default
                        }

                        if (!existingUser.name) existingUser.name = profile.displayName;

                        // Only set username if missing; otherwise leave as-is
                        if (!existingUser.username) {
                            existingUser.username = undefined; // will use schema default if any
                        }

                        await existingUser.save();
                        return done(null, existingUser);
                    } else {
                        // Create a new user with Google credentials
                        user = await User.create({
                            googleId: profile.id,
                            email: profile.emails?.[0]?.value,
                            name: profile.displayName || undefined,
                            username: undefined, // leave undefined to use default
                            profilePicture: profile.photos[0]?.value || undefined,
                        });
                        return done(null, user);
                    }
                }
                return done(null, user);
            } catch (err) {
                // Handle duplicate key error with a user-friendly message
                if (err.code === 11000 && err.keyPattern && err.keyPattern.email) {
                    return done(
                        new Error(
                            "An account with this email already exists. Please use a different email or try logging in with your existing account."
                        ),
                        null
                    );
                }
                return done(err, null);
            }
        }
    )
);

// ------------------------- Google OAuth Routes -------------------------
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get(
    "/auth/google/callback",
    passport.authenticate("google", {
        failureRedirect: "/login",
        failureFlash: true,
    }),
    (req, res) => {
        // Successful login
        req.flash("success", "Successfully logged in with Google!");
        res.redirect("/");
    }
);

// Add error handling for Google OAuth
app.use("/auth/google/callback", (err, req, res, next) => {
    if (err) {
        req.flash("error", err.message || "Authentication failed. Please try again.");
        return res.redirect("/login");
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
app.use("/api/push", require("./routes/push.routes.js"));

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

module.exports = app;
