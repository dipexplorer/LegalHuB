require("dotenv").config({
    path: require("path").resolve(__dirname, "../.env"),
});

const mongoose = require("mongoose");
const intRightsData = require("./rights.data.js");
const Right = require("../src/models/rights.model.js");
const db_connect = require("../src/db/index.js");

const initRightsDB = async () => {
    try {
        console.log("Connecting to database...");
        await db_connect();
        console.log("Connected to database successfully");
        
        console.log("Clearing existing rights data...");
        await Right.deleteMany({});
        console.log("Rights collection cleared successfully");
        
        console.log("Inserting new rights data...");
        await Right.insertMany(intRightsData.data);
        console.log(`Successfully inserted ${intRightsData.data.length} fundamental rights`);
        
        console.log("Database seeding completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Error initializing rights database:", err);
        process.exit(1);
    }
};

initRightsDB();
