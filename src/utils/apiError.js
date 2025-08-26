class apiError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.name = "apiError";
        Error.captureStackTrace(this, this.constructor);
    }
    toJSON() {
        return {
            statusCode: this.statusCode,
            name: this.name,
            message: this.message, // ✅ include message
        };
    }
}

module.exports = apiError;
