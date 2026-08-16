const express = require("express");
const {
    createQRCode,
    getQRCodes,
    getQRCodeById,
    getPublicQRCode,
    uploadQRDocument,
    deleteQRCode,
} = require("../controllers/qrController");
const upload = require("../middlewares/upload");

const router = express.Router();

// Public scan endpoint
router.get("/public/:codeId", getPublicQRCode);

// QR Code endpoints
router.get("/", getQRCodes);
router.post("/", createQRCode);
router.get("/:id", getQRCodeById);
router.post("/:id/document", upload.single("file"), uploadQRDocument);
router.post("/:id/attachments", upload.single("file"), uploadQRDocument);
router.delete("/:id", deleteQRCode);

module.exports = router;
