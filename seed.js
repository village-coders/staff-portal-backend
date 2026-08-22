require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/users");
const QRUser = require("./models/QRUser");
const connectToDb = require("./config/connectToDb");

/**
 * Database Seeder — creates default staff and QR portal users extracted from the database:
 *
 * Run once:  npm run seed
 */
const seed = async () => {
    console.log("🌱  Starting database seed...\n");

    await connectToDb();

    // Define seed users (Extracted from active database)
    const seedUsers = [
        {
            name: "Jaweria",
            username: "Jaweria",
            email: "jaweria@yahoo.com",
            role: "financial_officer",
            password: "$2a$12$OIN4DeGrv1KDbAK/Dh1vturx37prhFg69ZykwW.qnpFHjarAYHlWu",
            department: "Operations",
        },
        {
            name: "Taoheed",
            username: "Taoheed",
            email: "get2lekan@yahoo.com",
            role: "admin",
            password: "$2a$12$goDvcM5gcVdL2m22wY7mVuEoAphOwJ82H7SZPNQTiJrfIyBjg2bB2",
            department: "Operations",
        },
        {
            name: "Amir",
            username: "Amir",
            email: "amir@halalfoodauthority.com",
            role: "admin",
            password: "$2a$12$d/kc8.8iYp6zs2zVKdykmOU4rjCOMsHguvD1Q44btnUet14T4Rgda",
            department: "Operations",
        },
    ];

    // Seed QR Portal Users
    const seedQrUsers = [
        {
            name: "HFA Admin",
            username: "admin",
            email: "admin@hfa.org",
            role: "admin",
            password: "$2a$12$9qTX1/LK5yew.4vtQPHqlu8lBwIMivS8xYlJjthwLmy6eLtyZ4VcO",
            department: "Administration",
        },
    ];

    console.log("Checking and seeding Staff Portal users...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    for (const u of seedUsers) {
        const existing = await User.findOne({ username: u.username });
        if (existing) {
            console.log(`ℹ️   Staff User '${u.username}' already exists. Skipping.`);
            continue;
        }

        const hashedPassword = u.password.startsWith("$2a$") || u.password.startsWith("$2b$")
            ? u.password
            : await bcrypt.hash(u.password, 12);

        const createdUser = await User.create({
            name: u.name,
            username: u.username,
            email: u.email,
            role: u.role,
            password: hashedPassword,
            department: u.department,
            active: true,
        });

        console.log(`✅  Created Staff User [${createdUser.role}]: ${createdUser.username} (${createdUser.email})`);
    }

    console.log("\nChecking and seeding QR Portal users...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    for (const u of seedQrUsers) {
        const existing = await QRUser.findOne({ username: u.username });
        if (existing) {
            console.log(`ℹ️   QR User '${u.username}' already exists. Skipping.`);
            continue;
        }

        const hashedPassword = u.password.startsWith("$2a$") || u.password.startsWith("$2b$")
            ? u.password
            : await bcrypt.hash(u.password, 12);

        await QRUser.create({
            name: u.name,
            username: u.username,
            email: u.email,
            role: u.role,
            password: hashedPassword,
            department: u.department,
            active: true,
        });

        console.log(`✅  Created QR User [${u.role}]: ${u.username} (${u.email})`);
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🌱  Seeding completed successfully.\n");

    await mongoose.disconnect();
    process.exit(0);
};

seed().catch((err) => {
    console.error("❌  Seeding failed:", err.message);
    process.exit(1);
});

