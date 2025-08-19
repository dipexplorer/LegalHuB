const request = require("supertest");

// Mock authentication middleware for testing
const mockAuth = (user) => {
    return (req, res, next) => {
        req.user = user;
        req.isAuthenticated = () => true;
        next();
    };
};

// Create authenticated request with user context
const authenticatedRequest = (app, user) => {
    // Mock the authentication middleware
    const originalUse = app.use;
    app.use = function (path, middleware) {
        if (typeof path === "function") {
            middleware = path;
            path = "/";
        }

        // Replace auth middleware with mock
        if (middleware && middleware.name === "isLoggedIn") {
            return originalUse.call(this, path, mockAuth(user));
        }

        return originalUse.call(this, path, middleware);
    };

    return request(app);
};

// Create request with author field for simple auth simulation
const requestWithAuth = (app, user) => {
    const req = request(app);
    const originalSend = req.send;

    req.send = function (data = {}) {
        if (user) {
            data.author = user._id;
        }
        return originalSend.call(this, data);
    };

    return req;
};

module.exports = {
    mockAuth,
    authenticatedRequest,
    requestWithAuth,
};
