require("dotenv").config({
    path: require("path").resolve(__dirname, "../.env"),
});

const mongoose = require("mongoose");
const Right = require("../src/models/rights.model.js");
const db_connect = require("../src/db/index.js");

const verifyRightsData = async () => {
    try {
        console.log("Connecting to database...");
        await db_connect();
        console.log("Connected to database successfully");
        
        const rights = await Right.find({}).sort({ articleNumber: 1 });
        console.log(`\nFound ${rights.length} fundamental rights in database:\n`);
        
        // Group by category
        const categories = {};
        rights.forEach(right => {
            if (!categories[right.category]) {
                categories[right.category] = [];
            }
            categories[right.category].push(right);
        });
        
        // Display by category
        Object.keys(categories).forEach(category => {
            console.log(`📋 ${category} (${categories[category].length} rights):`);
            categories[category].forEach(right => {
                console.log(`   • Article ${right.articleNumber}: ${right.name}`);
            });
            console.log('');
        });
        
        console.log("✅ Database verification completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Error verifying rights database:", err);
        process.exit(1);
    }
};

verifyRightsData();