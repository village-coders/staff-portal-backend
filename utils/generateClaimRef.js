const Claim = require("../models/Claim");

/**
 * Auto-generate a unique claim reference number.
 * Format: IFRS-CLM-YYYY-XXXX (e.g. IFRS-CLM-2026-0042)
 *
 * Counts existing claims for the current year to determine the next sequence number.
 * Uses padded 4-digit zero-filled sequence for readability.
 *
 * @returns {Promise<string>} - Generated claim reference number
 */
const generateClaimRef = async () => {
    const year = new Date().getFullYear();
    const prefix = `IFRS-CLM-${year}-`;

    const count = await Claim.countDocuments({
        claimRefNo: { $regex: `^${prefix}` },
    });

    const seq = String(count + 1).padStart(4, "0");
    return `${prefix}${seq}`;
};

module.exports = generateClaimRef;
