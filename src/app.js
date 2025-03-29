if (process.env.NODE_ENV != "production") {
    require("dotenv").config(); // Load environment variables
}

const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require('mongoose');
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const flash = require("connect-flash");

// Passport Configuration
const passport = require("passport");
const LocalStrategy = require("passport-local");

// Import User model (Fix for passport authentication)
const User = require("./models/user.model.js");

// Import Utility Functions
const apiError = require("./utils/apiError.js");
const apiResponse = require("./utils/apiResponse.js");


// CORS Configuration
app.use(
    cors({
        origin: process.env.CORS_ORIGIN || "http://localhost:8000",
        credentials: true,
    })
);

// Middleware Setup (✅ Moved to the top)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// app.use(cookieParser());
app.use(express.static(path.join(__dirname, "/public")));
app.use(methodOverride("_method"));

// Set up view engine
app.engine("ejs", ejsMate);
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");


// Session Configuration
const sessionOptions = {
    secret: process.env.SESSION_SECRET || "mysecret",
    resave: false,
    saveUninitialized: true,//do not change it true
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
    },
};

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

// Passport Local Strategy
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Middleware to Add Global Variables
app.use((req, res, next) => {
    // console.log("SESSIONS INFO:", req.session);
    // console.log("USER INFO:", req.user);
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currentUser = req.user || null;
    next();
});

// Import Routes
const healthCheckRouter = require("./routes/healthCheck_route.js");
const dictionaryRoutes = require("./routes/dictionary.routes.js");
const rightsRoutes = require("./routes/rights.routes.js");
const documentsRoutes = require("./routes/document.routes.js");
const { smartSearch } = require("./controllers/search.controller.js");
const articleRoutes = require("./routes/article.routes.js");
const userRoutes = require("./routes/user.routes.js");
const pageRoutes = require('./routes/page.routes');


// ✅ Define the test route first
app.get("/", (req, res) => {
    res.status(200).json({ message: "Welcome to the API!" });
});
// API Routes
app.use("/healthcheck", healthCheckRouter);
app.use("/api/dictionary", dictionaryRoutes);
app.use("/api/rights", rightsRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/articles", articleRoutes);
app.use("/api/users", userRoutes);
app.use('/', pageRoutes);

// Smart Search
app.get("/api/search", smartSearch);

// Handle 404 Errors
app.all("*", (req, res) => {
    return res.status(404).json(new apiResponse(404, null, "Page not found"));
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Global Error Handler:", err);
    return res.status(err.statusCode || 500).json(
        new apiResponse(err.statusCode || 500, null, err.message || "Internal Server Error")
    );
});

module.exports = app;
