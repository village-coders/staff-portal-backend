/**
 * IFRS Claim Workflow State Machine
 *
 * Defines all valid status transitions and the roles permitted to perform them.
 * This is the single source of truth for claim lifecycle enforcement.
 */

const STATUSES = {
    SUBMITTED: "SUBMITTED",
    NEW: "NEW", // legacy compatibility
    PENDING: "PENDING",
    VERIFIED: "VERIFIED",
    FURTHER_APPROVAL: "FURTHER_APPROVAL",
    FURTHER_APPROVAL_APPROVED: "FURTHER_APPROVAL_APPROVED",
    FURTHER_APPROVAL_REJECTED: "FURTHER_APPROVAL_REJECTED",
    APPROVED_FOR_PAYMENT: "APPROVED_FOR_PAYMENT",
    PAID: "PAID",
    REJECTED: "REJECTED",
};

const normalize = (val) => {
    if (!val) return "";
    return String(val).toUpperCase().trim().replace(/[-\s]+/g, "_");
};

const normalizeRole = (val) => {
    if (!val) return "";
    let r = String(val).toLowerCase().trim().replace(/[-\s]+/g, "_");
    if (r.startsWith("chairman")) return "chairman";
    if (r.startsWith("super_admin") || r.startsWith("superadmin")) return "super_admin";
    if (r.startsWith("financial_officer") || r.startsWith("fo")) return "financial_officer";
    return r;
};

/**
 * Transition map structure:
 * { fromStatus: { toStatus: [allowedRoles] } }
 */
const TRANSITIONS = {
    [STATUSES.SUBMITTED]: {
        [STATUSES.VERIFIED]: ["financial_officer", "ceo", "admin", "super_admin"],
        [STATUSES.PENDING]: ["financial_officer", "ceo", "admin", "super_admin"],
        [STATUSES.REJECTED]: ["financial_officer", "ceo", "admin", "super_admin"],
        [STATUSES.FURTHER_APPROVAL]: ["ceo", "admin", "super_admin"],
        [STATUSES.APPROVED_FOR_PAYMENT]: ["ceo", "admin", "super_admin"],
    },
    [STATUSES.NEW]: {
        [STATUSES.VERIFIED]: ["financial_officer", "ceo", "admin", "super_admin"],
        [STATUSES.PENDING]: ["financial_officer", "ceo", "admin", "super_admin"],
        [STATUSES.REJECTED]: ["financial_officer", "ceo", "admin", "super_admin"],
        [STATUSES.FURTHER_APPROVAL]: ["ceo", "admin", "super_admin"],
        [STATUSES.APPROVED_FOR_PAYMENT]: ["ceo", "admin", "super_admin"],
    },
    [STATUSES.PENDING]: {
        // User resubmission — also handled by dedicated PUT /resubmit route
        [STATUSES.SUBMITTED]: ["user", "financial_officer", "ceo", "admin", "super_admin"],
        [STATUSES.NEW]: ["user", "financial_officer", "ceo", "admin", "super_admin"],
        [STATUSES.VERIFIED]: ["financial_officer", "ceo", "admin", "super_admin"],
        [STATUSES.REJECTED]: ["financial_officer", "ceo", "admin", "super_admin"],
        [STATUSES.FURTHER_APPROVAL]: ["ceo", "admin", "super_admin"],
    },
    [STATUSES.VERIFIED]: {
        [STATUSES.APPROVED_FOR_PAYMENT]: ["ceo", "admin", "super_admin"],
        [STATUSES.FURTHER_APPROVAL]: ["ceo", "chairman", "admin", "super_admin"],          // CEO escalates to Board
        [STATUSES.FURTHER_APPROVAL_APPROVED]: ["chairman", "ceo", "admin", "super_admin"],
        [STATUSES.FURTHER_APPROVAL_REJECTED]: ["chairman", "ceo", "admin", "super_admin"],
        [STATUSES.PENDING]: ["ceo", "financial_officer", "admin", "super_admin"],            // CEO returns to Financial Officer / Pending
        [STATUSES.SUBMITTED]: ["ceo", "financial_officer", "admin", "super_admin"],          // CEO returns to Financial Officer / Submitted
        [STATUSES.NEW]: ["ceo", "financial_officer", "admin", "super_admin"],                // Legacy
        [STATUSES.REJECTED]: ["ceo", "admin", "super_admin"],
    },
    [STATUSES.FURTHER_APPROVAL]: {
        [STATUSES.FURTHER_APPROVAL_APPROVED]: ["chairman", "ceo", "admin", "super_admin"], // Board approves → back to CEO
        [STATUSES.FURTHER_APPROVAL_REJECTED]: ["chairman", "ceo", "admin", "super_admin"], // Board rejects → back to CEO
        [STATUSES.APPROVED_FOR_PAYMENT]: ["ceo", "chairman", "admin", "super_admin"],
        [STATUSES.VERIFIED]: ["chairman", "ceo", "admin", "super_admin"],                 // Recall to verified
        [STATUSES.SUBMITTED]: ["ceo", "chairman", "admin", "super_admin"],
        [STATUSES.PENDING]: ["ceo", "chairman", "admin", "super_admin"],
        [STATUSES.REJECTED]: ["chairman", "ceo", "admin", "super_admin"],
    },
    [STATUSES.FURTHER_APPROVAL_APPROVED]: {
        [STATUSES.APPROVED_FOR_PAYMENT]: ["ceo", "admin", "super_admin"],                  // CEO approves for payment
        [STATUSES.FURTHER_APPROVAL]: ["ceo", "chairman", "admin", "super_admin"],         // Re-evaluate
        [STATUSES.FURTHER_APPROVAL_REJECTED]: ["chairman", "ceo", "admin", "super_admin"], // Board changes decision
        [STATUSES.SUBMITTED]: ["ceo", "admin", "super_admin"],                            // CEO returns to FO
        [STATUSES.PENDING]: ["ceo", "admin", "super_admin"],                              // CEO returns to user
        [STATUSES.REJECTED]: ["ceo", "admin", "super_admin"],                             // CEO rejects
        [STATUSES.VERIFIED]: ["ceo", "admin", "super_admin"],                             // CEO returns to verified
    },
    [STATUSES.FURTHER_APPROVAL_REJECTED]: {
        [STATUSES.REJECTED]: ["ceo", "admin", "super_admin"],                             // CEO rejects
        [STATUSES.PENDING]: ["ceo", "admin", "super_admin"],                              // CEO returns to user for info
        [STATUSES.SUBMITTED]: ["ceo", "admin", "super_admin"],                            // CEO returns to FO
        [STATUSES.FURTHER_APPROVAL]: ["ceo", "chairman", "admin", "super_admin"],         // Re-escalates to board
        [STATUSES.FURTHER_APPROVAL_APPROVED]: ["chairman", "ceo", "admin", "super_admin"], // Board reverses rejection
        [STATUSES.APPROVED_FOR_PAYMENT]: ["ceo", "admin", "super_admin"],
        [STATUSES.VERIFIED]: ["ceo", "admin", "super_admin"],
    },
    [STATUSES.APPROVED_FOR_PAYMENT]: {
        [STATUSES.PAID]: ["accountant", "admin", "super_admin"],
        [STATUSES.VERIFIED]: ["ceo", "admin", "super_admin"],
        [STATUSES.FURTHER_APPROVAL_APPROVED]: ["ceo", "admin", "super_admin"],
        [STATUSES.SUBMITTED]: ["ceo", "admin", "super_admin"],
        [STATUSES.REJECTED]: ["ceo", "admin", "super_admin"],
    },
    [STATUSES.PAID]: {
        [STATUSES.APPROVED_FOR_PAYMENT]: ["accountant", "admin", "super_admin"],
    },
    [STATUSES.REJECTED]: {
        [STATUSES.SUBMITTED]: ["ceo", "financial_officer", "admin", "super_admin"],
        [STATUSES.PENDING]: ["ceo", "financial_officer", "admin", "super_admin"],
        [STATUSES.VERIFIED]: ["ceo", "financial_officer", "admin", "super_admin"],
        [STATUSES.FURTHER_APPROVAL]: ["ceo", "admin", "super_admin"],
    },
};

/**
 * Validate whether a role can perform a given status transition.
 *
 * @param {string} fromStatus  - Current claim status
 * @param {string} toStatus    - Target status
 * @param {string} role        - Actor's role
 * @returns {{ valid: boolean, message?: string }}
 */
const validateTransition = (fromStatus, toStatus, role) => {
    const from = normalize(fromStatus);
    const to = normalize(toStatus);
    const r = normalizeRole(role);

    // super_admin and admin have master workflow clearance
    if (r === "super_admin" || r === "admin") {
        return { valid: true };
    }

    const allowedTargets = TRANSITIONS[from];

    if (!allowedTargets) {
        return {
            valid: false,
            message: `Claims in status '${fromStatus}' have no permitted outgoing transitions.`,
        };
    }

    const allowedRoles = allowedTargets[to];

    if (!allowedRoles) {
        return {
            valid: false,
            message: `Transition from '${fromStatus}' to '${toStatus}' is not a valid workflow step.`,
        };
    }

    const normalizedAllowedRoles = allowedRoles.map((x) => normalizeRole(x));

    if (!normalizedAllowedRoles.includes(r)) {
        return {
            valid: false,
            message: `Role '${role}' is not authorized to transition a claim from '${fromStatus}' to '${toStatus}'.`,
        };
    }

    return { valid: true };
};

module.exports = { STATUSES, TRANSITIONS, validateTransition, normalize, normalizeRole };