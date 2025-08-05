require("dotenv").config({
    path: require("path").resolve(__dirname, "../.env"),
});

const mongoose = require("mongoose");
const intRightsData = require("./rights.data.js");
const Right = require("../src/models/rights.model.js");
const app = require("../src/app.js");
const db_connect = require("../src/db/index.js");

const PORT = process.env.PORT || 8000;

db_connect()
    .then(
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        })
    )
    .catch((err) => {
        console.error("Error connecting to MongoDB", err);
        process.exit(1);
    });

const initRightsDB = async () => {
    try {
        await Right.deleteMany({});
        console.log("Rights collection deleted successfully");
        await Right.insertMany(intRightsData.data);
        console.log("Rights data inserted successfully");
        process.exit(0);
    } catch (err) {
        console.error("Error initializing rights database", err);
        process.exit(1);
    }
};

initRightsDB();
