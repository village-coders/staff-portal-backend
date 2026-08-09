require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/users");
const connectToDb = require("./config/connectToDb");

/**
 * Database Seeder — creates the first super_admin account.
 *
 * Run once:  node seed.js
 *
 * ⚠️  Change the default password immediately after first login!
 */
const seed = async () => {
    console.log("🌱  Starting database seed...\n");

    await connectToDb();

    // Check if a super_admin already exists
    const existing = await User.findOne({ role: "super_admin" });
    if (existing) {
        console.log("⚠️   A super_admin account already exists.");
        console.log(`    Username: ${existing.username}`);
        console.log("    Skipping seed. No changes made.\n");
        await mongoose.disconnect();
        process.exit(0);
    }

    const defaultPassword = "SuperAdmin@123";
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    const admin = await User.create({
        name: "System Super Admin",
        username: "superadmin",
        password: hashedPassword,
        email: "superadmin@hfa.org",
        role: "super_admin",
        department: "Administration",
        active: true,
    });

    console.log("✅  Super Admin created successfully!\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`  Username  : ${admin.username}`);
    console.log(`  Password  : ${defaultPassword}`);
    console.log(`  Email     : ${admin.email}`);
    console.log(`  Role      : ${admin.role}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n⚠️  IMPORTANT: Change the default password immediately after login!\n");

    await mongoose.disconnect();
    process.exit(0);
};

seed().catch((err) => {
    console.error("❌  Seeding failed:", err.message);
    process.exit(1);
});
