if (process.env.NODE_ENV !== "production") {
require("dotenv").config();
}

const express = require("express");
const app = express();

const cors = require("cors");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const cookieParser = require("cookie-parser");

const passport = require("passport");
const LocalStrategy = require("passport-local");

// Models
const User = require("./models/user.model.js");

// Utils
const apiError = require("./utils/apiError.js");
const apiResponse = require("./utils/apiResponse.js");

// Middlewares
const apiLimiter = require("./middlewares/rateLimiter.middleware.js");

// Trust proxy in production for secure cookies
if (process.env.NODE_ENV === "production") {
app.set("trust proxy", 1);
}

// CORS
app.use(
cors({
origin: process.env.CORS_ORIGIN || "http://localhost:8000",
credentials: true,
})
);

// Core middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "/public")));
app.use(methodOverride("_method"));

// Views
app.engine("ejs", ejsMate);
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Sessions
const sessionOptions = {
secret: process.env.SESSION_SECRET || "mysecret",
resave: false,
saveUninitialized: false,
cookie: {
expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
maxAge: 7 * 24 * 60 * 60 * 1000,
httpOnly: true,
secure: process.env.NODE_ENV === "production",
sameSite: "lax",
},
};

// Only add MongoStore in non-test environments (avoid open handles in tests)
if (process.env.NODE_ENV !== "test") {
sessionOptions.store = MongoStore.create({
mongoUrl: process.env.DB_URL,
collectionName: "sessions",
ttl: 7 * 24 * 60 * 60,
});
}

app.use(session(sessionOptions));
app.use(flash());

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Choose ONE local strategy registration. Using passport-local-mongoose helpers:
passport.use(new LocalStrategy(User.authenticate()));
// If you prefer, you can replace the above with: passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Load Google OAuth strategy (ensure file exists)
require("./config/passport.google.js");

// Locals for templates
app.use((req, res, next) => {
res.locals.success = req.flash("success");
res.locals.error = req.flash("error");
res.locals.currentUser = req.user || null;
next();
});

// Routes
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

// Google auth routes (top-level, not under /api)
const authRoutes = require("./routes/auth.routes.js");
app.use(authRoutes);

// API routes with rate limiter
app.use("/api", apiLimiter);
app.use("/api/healthcheck", healthCheckRouter);
app.use("/api/dictionary", dictionaryRoutes);
app.use("/api/rights", rightsRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/articles", articleRoutes);
app.use("/api/users", userRoutes);
app.use("/api/lawyers", lawyerRoutes);
app.use("/api/appointment", appointmentRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);

// Non-API routes
app.use("/", pageRoutes);
app.use("/chat", chatRoutes);

// Smart Search
app.get("/api/search", smartSearch);

// 404 handler
app.all("*", (req, res) => {
res.status(404).render("pages/nopage");
});

// Global error handler
app.use((err, req, res, next) => {
const isProd = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

if (!isProd && !isTest) {
if (err.name === "apiError" || err instanceof apiError) {
console.error(❌ ${err.message} [${err.statusCode}]);
} else {
console.error("🔥 Unexpected Error:", err);
}
}

return res
.status(err.statusCode || 500)
.json(new apiResponse(err.statusCode || 500, null, err.message || "Internal Server Error"));
});

module.exports = app;