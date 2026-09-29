const Claim = require("../models/Claim");

/**
 * Auto-generate a unique claim reference number.
 * Format: IFRS-CLM-YYYY-XXXX (e.g. IFRS-CLM-2026-0042)
 *
 * Finds the highest existing sequence number for the current year
 * to guarantee no duplicate key collisions (even if records were deleted or gaps exist).
 *
 * @returns {Promise<string>} - Generated unique claim reference number
 */
const generateClaimRef = async () => {
    const year = new Date().getFullYear();
    const prefix = `IFRS-CLM-${year}-`;

    // Query existing claims matching the prefix to find the true maximum sequence number
    const claims = await Claim.find({
        claimRefNo: { $regex: `^${prefix}` },
    })
        .select("claimRefNo")
        .lean();

    let maxSeq = 0;
    if (claims && claims.length > 0) {
        for (const c of claims) {
            if (c.claimRefNo) {
                const parts = c.claimRefNo.split("-");
                const num = parseInt(parts[parts.length - 1], 10);
                if (!isNaN(num) && num > maxSeq) {
                    maxSeq = num;
                }
            }
        }
    }

    let nextSeq = maxSeq + 1;
    let candidate = `${prefix}${String(nextSeq).padStart(4, "0")}`;

    // Extra safety guarantee: verify candidate does not exist in DB
    while (await Claim.exists({ claimRefNo: candidate })) {
        nextSeq++;
        candidate = `${prefix}${String(nextSeq).padStart(4, "0")}`;
    }

    return candidate;
};

module.exports = generateClaimRef;
