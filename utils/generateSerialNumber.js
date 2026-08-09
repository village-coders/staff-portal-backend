const crypto = require("crypto");
const Asset = require("../models/Asset");

/**
 * Auto-generate a unique asset serial number.
 * Format: SN-AST-XXXXXXXX-X000 (e.g. SN-AST-A3F9B2C1-X001)
 *
 * Uses cryptographically random hex + sequential count suffix for uniqueness.
 *
 * @returns {Promise<string>} - Generated serial number
 */
const generateSerialNumber = async () => {
    const count = await Asset.countDocuments();
    const randomHex = crypto.randomBytes(4).toString("hex").toUpperCase();
    const seq = String(count + 1).padStart(3, "0");
    return `SN-AST-${randomHex}-X${seq}`;
};

module.exports = generateSerialNumber;
