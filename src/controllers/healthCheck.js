const apiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

const healthCheck = asyncHandler(async (req, res) => {
    const healthData = {
        status: "OK",
        uptime: process.uptime(), // in seconds
        memoryUsage: process.memoryUsage(), // RAM usage
        timestamp: new Date().toISOString(), // Current time
        env: process.env.NODE_ENV || "development", // Useful info
    };

    return res.status(200).json(new apiResponse(200, healthData, "Health Check Passed"));
});

module.exports = healthCheck;
