/**
 * migrate_from_halalacc.cjs
 * ─────────────────────────────────────────────────────────────
 * Migrates all users from the legacy HalalAcc database (tlbWokes)
 * into MongoDB. Passwords were AES-encrypted in the old system,
 * so we set a safe temporary password: HFA@2026
 *
 * rolss mapping:
 *   1 = user
 *   2 = financial_officer
 *   4 = accountant
 *   5 = admin
 *   6 = chairman
 *
 * Run: node migrate_from_halalacc.cjs
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
const User     = require("./models/users");
const path     = require("path");
const fs       = require("fs");

const MONGO_URI     = process.env.MONGO_URI;
const DB_NAME       = process.env.DB_NAME || "HfaStaffPortal";
const SOURCE_JSON   = path.resolve(
    __dirname,
    "../database_scripts/HalalAcc/json_exports/tlbWokes.json"
);
const TEMP_PASSWORD = "HFA@2026"; // All migrated users reset to this

// Map old rolss integers to MongoDB role strings
const ROLE_MAP = {
    1: "user",
    2: "financial_officer",
    3: "user",          // not seen, default to user
    4: "accountant",
    5: "admin",
    6: "chairman",
};

const run = async () => {
    console.log("🔌  Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI, { dbName: DB_NAME });
    console.log(`✅  Connected to: ${DB_NAME}\n`);

    // Read legacy users
    const rawUsers = JSON.parse(fs.readFileSync(SOURCE_JSON, "utf-8").replace(/^\uFEFF/, ""));
    console.log(`📂  Loaded ${rawUsers.length} users from tlbWokes.json\n`);

    // Hash the temp password once
    const hashedTemp = await bcrypt.hash(TEMP_PASSWORD, 12);

    let created = 0, skipped = 0, disabled = 0;

    console.log("─────────────────────────────────────────────────────────");

    for (const u of rawUsers) {
        const username   = (u.UserID || "").trim();
        const name       = (u.SName  || username).trim();
        const department = (u.Departmet || "Operations").trim();
        const role       = ROLE_MAP[u.rolss] || "user";
        const isDisabled = u.Discon === true;

        // Skip blank/test usernames
        if (!username || username.toLowerCase() === "test" || username.toLowerCase() === "test2") {
            console.log(`⏭️   Skipping test/blank user: '${username}'`);
            skipped++;
            continue;
        }

        // Generate a placeholder email from username if email is encrypted
        // The EMailer field is AES-encrypted, so we derive a safe placeholder
        const email = `${username.toLowerCase().replace(/[^a-z0-9.@_-]/g, "")}@hfa-migrated.local`;

        // Check if already exists
        const existing = await User.findOne({
            $or: [{ username }, { username: username.toLowerCase() }]
        });

        if (existing) {
            console.log(`ℹ️   Already exists — skipping: ${username}`);
            skipped++;
            continue;
        }

        await User.create({
            name,
            username,
            email,
            role,
            password:   hashedTemp,
            department,
            active:     !isDisabled,
        });

        if (isDisabled) {
            console.log(`⚠️   Created (INACTIVE) [${role}]: ${username} — ${name}`);
            disabled++;
        } else {
            console.log(`✅  Created [${role}]: ${username} — ${name} (${department})`);
        }
        created++;
    }

    // Final summary
    const allUsers = await User.find({}).lean();
    console.log("\n─────────────────────────────────────────────────────────");
    console.log(`🎉  Migration complete!`);
    console.log(`    ✅ Created : ${created}`);
    console.log(`    ⏭️  Skipped : ${skipped}`);
    console.log(`    ⚠️  Disabled: ${disabled} (created but inactive)`);
    console.log(`    📦 Total in DB: ${allUsers.length} users\n`);
    console.log(`🔑  Temp password for all migrated users: ${TEMP_PASSWORD}`);
    console.log("─────────────────────────────────────────────────────────\n");

    await mongoose.disconnect();
    process.exit(0);
};

run().catch(err => {
    console.error("❌  Migration failed:", err.message);
    process.exit(1);
});
