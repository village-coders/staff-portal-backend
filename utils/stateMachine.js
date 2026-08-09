/**
 * IFRS Claim Workflow State Machine
 *
 * Defines all valid status transitions and the roles permitted to perform them.
 * This is the single source of truth for claim lifecycle enforcement.
 */

const STATUSES = {
    NEW: "NEW",
    PENDING: "PENDING",
    VERIFIED: "VERIFIED",
    FURTHER_APPROVAL: "FURTHER_APPROVAL",
    APPROVED_FOR_PAYMENT: "APPROVED_FOR_PAYMENT",
    PAID: "PAID",
    REJECTED: "REJECTED",
};

/**
 * Transition map structure:
 * { fromStatus: { toStatus: [allowedRoles] } }
 */
const TRANSITIONS = {
    [STATUSES.NEW]: {
        [STATUSES.VERIFIED]: ["financial_officer", "admin"],
        [STATUSES.PENDING]: ["financial_officer", "admin"],
        [STATUSES.REJECTED]: ["financial_officer", "admin"],
    },
    [STATUSES.PENDING]: {
        // User resubmission — also handled by dedicated PUT /resubmit route
        [STATUSES.NEW]: ["user", "admin"],
    },
    [STATUSES.VERIFIED]: {
        [STATUSES.APPROVED_FOR_PAYMENT]: ["ceo", "admin"],
        [STATUSES.FURTHER_APPROVAL]: ["ceo", "admin"],   // CEO escalates to Board
        [STATUSES.PENDING]: ["ceo", "admin"],            // CEO returns to Financial Officer / Pending
        [STATUSES.NEW]: ["ceo", "admin"],                 // CEO returns to Financial Officer / New
    },
    [STATUSES.FURTHER_APPROVAL]: {
        [STATUSES.VERIFIED]: ["chairman", "admin"],  // Board approves → back to CEO
        [STATUSES.REJECTED]: ["chairman", "admin"],
    },
    [STATUSES.APPROVED_FOR_PAYMENT]: {
        [STATUSES.PAID]: ["accountant", "admin"],
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