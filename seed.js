require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/users");
const connectToDb = require("./config/connectToDb");

/**
 * Database Seeder — creates default users for all 6 system roles:
 * - user (staff)
 * - financial_officer
 * - ceo
 * - accountant
 * - admin
 * - chairman
 *
 * Run once:  npm run seed
 */
const seed = async () => {
    console.log("🌱  Starting database seed...\n");

    await connectToDb();

    // Define seed users
    const seedUsers = [
        {
            name: "System Admin",
            username: "admin",
            email: "admin@hfa.org",
            role: "admin",
            password: "Admin@123",
            department: "Administration",
        },
        {
            name: "John Staff",
            username: "staff",
            email: "staff@hfa.org",
            role: "user",
            password: "Staff@123",
            department: "Operations",
        },
        {
            name: "Jane Financial Officer",
            username: "fo",
            email: "fo@hfa.org",
            role: "financial_officer",
            password: "Officer@123",
            department: "Finance",
        },
        {
            name: "Chief Executive Officer",
            username: "ceo",
            email: "ceo@hfa.org",
            role: "ceo",
            password: "Ceo@123",
            department: "Executive",
        },
        {
            name: "Board Chairman",
            username: "chairman",
            email: "chairman@hfa.org",
            role: "chairman",
            password: "Chairman@123",
            department: "Board",
        },
        {
            name: "Alice Accountant",
            username: "accountant",
            email: "accountant@hfa.org",
            role: "accountant",
            password: "Accountant@123",
            department: "Finance",
        },
    ];

    console.log("Checking and seeding users...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    for (const u of seedUsers) {
        const existing = await User.findOne({ username: u.username });
        if (existing) {
            console.log(`ℹ️   User '${u.username}' already exists. Skipping.`);
            continue;
        }

        const hashedPassword = await bcrypt.hash(u.password, 12);
        const createdUser = await User.create({
            name: u.name,
            username: u.username,
            email: u.email,
            role: u.role,
            password: hashedPassword,
            department: u.department,
            active: true,
        });

        console.log(`✅  Created user [${createdUser.role}]:`);
        console.log(`    Username  : ${createdUser.username}`);
        console.log(`    Password  : ${u.password}`);
        console.log(`    Email     : ${createdUser.email}`);
        console.log("─────────────────────────────────────────────────────────");
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🌱  Seeding completed.\n");

    await mongoose.disconnect();
    process.exit(0);
};

seed().catch((err) => {
    console.error("❌  Seeding failed:", err.message);
    process.exit(1);
});
