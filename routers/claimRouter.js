const express = require("express");
const {
    submitClaim,
    getClaims,
    getClaimById,
    transitionClaim,
    resubmitClaim,
    uploadClaimAttachments,
    deleteClaim,
    restoreClaim,
    purgeClaim,
    getClaimsSummary,
} = require("../controllers/claimController");
const { protect, authorize } = require("../middlewares/authMiddlewares");
const upload = require("../middlewares/upload");

const router = express.Router();

// All claim routes require authentication
router.use(protect);

// POST /api/v1/claims               — submit a new claim (all authenticated staff)
router.post("/", submitClaim);

// GET  /api/v1/claims               — list claims (role-filtered, supports ?deleted=true for super_admin)
router.get("/", getClaims);

// GET  /api/v1/claims/summary        — fast status count aggregation (dashboard)
router.get("/summary", getClaimsSummary);

// GET  /api/v1/claims/:id           — get claim by ObjectId or claimRefNo
router.get("/:id", getClaimById);

// PATCH /api/v1/claims/:id/transition — state machine transition
// Body: { newStatus: string, note?: string }
router.patch("/:id/transition", transitionClaim);

// PUT /api/v1/claims/:id/resubmit   — resubmit PENDING claim (claimant)
router.put("/:id/resubmit", resubmitClaim);

// POST /api/v1/claims/:id/attachments — upload files via GridFS (field: "files")
router.post("/:id/attachments", upload.array("files", 10), uploadClaimAttachments);

// DELETE /api/v1/claims/:id         — soft delete (super_admin ONLY)
router.delete("/:id", authorize("super_admin"), deleteClaim);

// POST /api/v1/claims/:id/restore   — restore deleted claim (super_admin ONLY)
router.post("/:id/restore", authorize("super_admin"), restoreClaim);

// DELETE /api/v1/claims/:id/purge   — permanently delete claim (super_admin ONLY)
router.delete("/:id/purge", authorize("super_admin"), purgeClaim);

module.exports = router;
