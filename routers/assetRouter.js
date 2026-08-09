const express = require("express");
const {
    getAssets,
    createAsset,
    getAssetById,
    updateAsset,
    uploadAssetAttachments,
    deleteAsset,
} = require("../controllers/assetController");
const { protect, authorize } = require("../middlewares/authMiddlewares");
const upload = require("../middlewares/upload");

const router = express.Router();

// All asset routes require authentication
router.use(protect);

// GET  /api/v1/assets           — list all assets (all authenticated roles)
router.get("/", getAssets);

// POST /api/v1/assets           — register a new asset
router.post(
    "/",
    authorize("admin", "super_admin", "financial_officer"),
    createAsset
);

// GET  /api/v1/assets/:id       — get asset by ObjectId or serialNumber
router.get("/:id", getAssetById);

// PUT  /api/v1/assets/:id       — update asset details (serial number immutable)
router.put(
    "/:id",
    authorize("admin", "super_admin", "financial_officer"),
    updateAsset
);

// POST /api/v1/assets/:id/attachments — upload files for an asset (GridFS)
router.post(
    "/:id/attachments",
    authorize("admin", "super_admin", "financial_officer"),
    upload.array("files", 10),
    uploadAssetAttachments
);

// DELETE /api/v1/assets/:id     — delete asset (admin/super_admin)
router.delete("/:id", authorize("admin", "super_admin"), deleteAsset);

module.exports = router;
