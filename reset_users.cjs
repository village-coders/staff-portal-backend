/**
 * reset_users.cjs
 * ─────────────────────────────────────────────────────────────
 * 1. Backs up all current users to console (for visibility)
 * 2. Deletes every user EXCEPT role === "super_admin"
 * 3. Re-seeds the deleted users back from the known list
 *
 * Run: node reset_users.cjs
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
const User     = require("./models/users");

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME   = process.env.DB_NAME || "HfaStaffPortal";

// ── Users to restore (non-superadmin) ─────────────────────────
// Passwords are already bcrypt-hashed exactly as in seed.js
const RESTORE_USERS = [
    {
        name:       "Jaweria",
        username:   "Jaweria",
        email:      "jaweria@yahoo.com",
        role:       "financial_officer",
        password:   "$2a$12$OIN4DeGrv1KDbAK/Dh1vturx37prhFg69ZykwW.qnpFHjarAYHlWu",
        department: "Operations",
    },
    {
        name:       "Taoheed",
        username:   "Taoheed",
        email:      "get2lekan@yahoo.com",
        role:       "admin",
        password:   "$2a$12$goDvcM5gcVdL2m22wY7mVuEoAphOwJ82H7SZPNQTiJrfIyBjg2bB2",
        department: "Operations",
    },
    {
        name:       "Amir",
        username:   "Amir",
        email:      "amir@halalfoodauthority.com",
        role:       "admin",
        password:   "$2a$12$d/kc8.8iYp6zs2zVKdykmOU4rjCOMsHguvD1Q44btnUet14T4Rgda",
        department: "Operations",
    },
    {
        name:       "Haytham",
        username:   "Haytham",
        email:      "haytham@halalfoodauthority.com",
        role:       "financial_officer",
        password:   " ",          // will be hashed below
        department: "Operations",
    },
];

const run = async () => {
    console.log("🔌  Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
    console.log(`✅  Connected to: ${DB_NAME}\n`);

    // ── 1. Show current users ──────────────────────────────────
    const all = await User.find({}).lean();
    console.log(`📋  Current users in DB (${all.length} total):`);
    all.forEach(u => console.log(`    • [${u.role}] ${u.username} — ${u.email}`));
    console.log();

    // ── 2. Delete all NON-superadmin users ────────────────────
    const result = await User.deleteMany({ role: { $ne: "super_admin" } });
    console.log(`🗑️   Deleted ${result.deletedCount} non-superadmin user(s).\n`);

    // Confirm superadmin is still there
    const sa = await User.findOne({ role: "super_admin" });
    console.log(`🛡️   Superadmin still present: ${sa ? `YES — ${sa.username} (${sa.email})` : "NO ⚠️"}\n`);

    // ── 3. Re-seed deleted users ───────────────────────────────
    console.log("🌱  Restoring users...");
    console.log("─────────────────────────────────────────────────────────");

    for (const u of RESTORE_USERS) {
        // Skip if somehow already exists
        const exists = await User.findOne({ username: u.username });
        if (exists) {
            console.log(`ℹ️   '${u.username}' already exists — skipping.`);
            continue;
        }

        const hashed = u.password.startsWith("$2a$") || u.password.startsWith("$2b$")
            ? u.password
            : await bcrypt.hash(u.password.trim() || "changeme123", 12);

        const created = await User.create({
            name:       u.name,
            username:   u.username,
            email:      u.email,
            role:       u.role,
            password:   hashed,
            department: u.department,
            active:     true,
        });

        console.log(`✅  Restored [${created.role}]: ${created.username} (${created.email})`);
    }

    // ── 4. Final state ─────────────────────────────────────────
    const final = await User.find({}).lean();
    console.log("\n─────────────────────────────────────────────────────────");
    console.log(`🎉  Done! DB now has ${final.length} user(s):`);
    final.forEach(u => console.log(`    • [${u.role}] ${u.username} — ${u.email}`));

    await mongoose.disconnect();
    process.exit(0);
};

run().catch(err => {
    console.error("❌  Error:", err.message);
    process.exit(1);
});
