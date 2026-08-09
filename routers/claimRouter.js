const express = require("express");
const {
    submitClaim,
    getClaims,
    getClaimById,
    transitionClaim,
    resubmitClaim,
    uploadClaimAttachments,
    deleteClaim,
} = require("../controllers/claimController");
const { protect, authorize } = require("../middlewares/authMiddlewares");
const upload = require("../middlewares/upload");

const router = express.Router();

// All claim routes require authentication
router.use(protect);

// POST /api/v1/claims               — submit a new claim (users only)
router.post("/", authorize("user", "admin"), submitClaim);

// GET  /api/v1/claims               — list claims (role-filtered)
router.get("/", getClaims);

// GET  /api/v1/claims/:id           — get claim by ObjectId or claimRefNo
router.get("/:id", getClaimById);

// PATCH /api/v1/claims/:id/transition — state machine transition
// Body: { newStatus: string, note?: string }
router.patch("/:id/transition", transitionClaim);

// PUT /api/v1/claims/:id/resubmit   — resubmit PENDING claim (user/admin)
router.put("/:id/resubmit", authorize("user", "admin"), resubmitClaim);

// POST /api/v1/claims/:id/attachments — upload files via GridFS (field: "files")
router.post("/:id/attachments", upload.array("files", 10), uploadClaimAttachments);

// DELETE /api/v1/claims/:id         — hard delete (admin only)
router.delete("/:id", authorize("admin"), deleteClaim);

module.exports = router;
