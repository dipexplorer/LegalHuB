const mongoose = require("mongoose");
require("dotenv").config();

const DB_NAME = require("../constants.js");

const DB_URL = process.env.DB_URL;

const db_connect = async () => {
    try {
       const connectionIsntance = await mongoose.connect(DB_URL);

        // Don't append DB_NAME to DB_URL as it's already included in the .env file

        // const connectionIsntance = await mongoose.connect(DB_URL);
        console.log(`connected to DB! DB host: ${connectionIsntance.connection.host}`);
    } catch (err) {
        console.error("Error connecting to MongoDB", err);
        process.exit(1);
    }
};

module.exports = db_connect;
