const mongoose = require("mongoose");
require("dotenv").config();

const connectToDb = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            dbName: process.env.DB_NAME,
        });
        console.log(
            `✅ MongoDB Connected: ${conn.connection.host} | DB: ${conn.connection.name}`
        );
    } catch (error) {
        console.error("❌ Failed to connect to MongoDB:", error.message);
        process.exit(1);
    }
};

module.exports = connectToDb;
