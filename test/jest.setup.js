const mongoose = require("mongoose");
const { useConditionalConsole, restoreOriginalConsole } = require("../src/utils/logger");

// Suppress console logs during tests
beforeAll(async () => {
    useConditionalConsole();
    await mongoose.connect(global.__MONGO_URI__);
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    // Restore original console after tests
    restoreOriginalConsole();
});
