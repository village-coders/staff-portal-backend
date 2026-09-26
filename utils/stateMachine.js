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

/**
 * Transition map structure:
 * { fromStatus: { toStatus: [allowedRoles] } }
 */
const TRANSITIONS = {
    [STATUSES.SUBMITTED]: {
        [STATUSES.VERIFIED]: ["financial_officer", "admin", "super_admin"],
        [STATUSES.PENDING]: ["financial_officer", "admin", "super_admin"],
        [STATUSES.REJECTED]: ["financial_officer", "admin", "super_admin"],
    },
    [STATUSES.NEW]: {
        [STATUSES.VERIFIED]: ["financial_officer", "admin", "super_admin"],
        [STATUSES.PENDING]: ["financial_officer", "admin", "super_admin"],
        [STATUSES.REJECTED]: ["financial_officer", "admin", "super_admin"],
    },
    [STATUSES.PENDING]: {
        // User resubmission — also handled by dedicated PUT /resubmit route
        [STATUSES.SUBMITTED]: ["user", "admin", "super_admin"],
        [STATUSES.NEW]: ["user", "admin", "super_admin"],
    },
    [STATUSES.VERIFIED]: {
        [STATUSES.APPROVED_FOR_PAYMENT]: ["ceo", "admin", "super_admin"],
        [STATUSES.FURTHER_APPROVAL]: ["ceo", "admin", "super_admin"],   // CEO escalates to Board
        [STATUSES.PENDING]: ["ceo", "admin", "super_admin"],            // CEO returns to Financial Officer / Pending
        [STATUSES.SUBMITTED]: ["ceo", "admin", "super_admin"],          // CEO returns to Financial Officer / Submitted
        [STATUSES.NEW]: ["ceo", "admin", "super_admin"],                // Legacy
        [STATUSES.REJECTED]: ["ceo", "admin", "super_admin"],
    },
    [STATUSES.FURTHER_APPROVAL]: {
        [STATUSES.FURTHER_APPROVAL_APPROVED]: ["chairman", "admin", "super_admin"], // Board approves → back to CEO
        [STATUSES.FURTHER_APPROVAL_REJECTED]: ["chairman", "admin", "super_admin"], // Board rejects → back to CEO
        [STATUSES.VERIFIED]: ["chairman", "admin", "super_admin"],                 // Legacy fallback
        [STATUSES.REJECTED]: ["chairman", "admin", "super_admin"],
    },
    [STATUSES.FURTHER_APPROVAL_APPROVED]: {
        [STATUSES.APPROVED_FOR_PAYMENT]: ["ceo", "admin", "super_admin"], // CEO approves for payment
        [STATUSES.SUBMITTED]: ["ceo", "admin", "super_admin"],            // CEO returns to FO
        [STATUSES.PENDING]: ["ceo", "admin", "super_admin"],
        [STATUSES.REJECTED]: ["ceo", "admin", "super_admin"],
    },
    [STATUSES.FURTHER_APPROVAL_REJECTED]: {
        [STATUSES.REJECTED]: ["ceo", "admin", "super_admin"],             // CEO rejects
        [STATUSES.PENDING]: ["ceo", "admin", "super_admin"],              // CEO returns to user for info
        [STATUSES.SUBMITTED]: ["ceo", "admin", "super_admin"],            // CEO returns to FO
        [STATUSES.FURTHER_APPROVAL]: ["ceo", "admin", "super_admin"],     // CEO re-escalates to board
    },
    [STATUSES.APPROVED_FOR_PAYMENT]: {
        [STATUSES.PAID]: ["accountant", "admin", "super_admin"],
    },
    // PAID and REJECTED are terminal states — no outgoing transitions
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
    const allowedTargets = TRANSITIONS[fromStatus];

    if (!allowedTargets) {
        return {
            valid: false,
            message: `Claims in status '${fromStatus}' have no permitted outgoing transitions.`,
        };
    }

    const allowedRoles = allowedTargets[toStatus];

    if (!allowedRoles) {
        return {
            valid: false,
            message: `Transition from '${fromStatus}' to '${toStatus}' is not a valid workflow step.`,
        };
    }

    if (!allowedRoles.includes(role)) {
        return {
            valid: false,
            message: `Role '${role}' is not authorized to transition a claim from '${fromStatus}' to '${toStatus}'.`,
        };
    }

    return { valid: true };
};

module.exports = { STATUSES, TRANSITIONS, validateTransition };