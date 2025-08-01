class apiError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = "apiError";
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = apiError;
