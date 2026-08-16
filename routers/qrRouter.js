const express = require("express");
const {
    createQRCode,
    getQRCodes,
    getQRCodeById,
    getPublicQRCode,
    streamPublicQRDocument,
    uploadQRDocument,
    deleteQRCode,
} = require("../controllers/qrController");
const upload = require("../middlewares/upload");

const router = express.Router();

// Direct file streaming when QR code is scanned
router.get("/scan/:codeId", streamPublicQRDocument);

// Public scan JSON metadata endpoint
router.get("/public/:codeId", getPublicQRCode);

// QR Code endpoints
router.get("/", getQRCodes);
router.post("/", createQRCode);
router.get("/:id", getQRCodeById);
router.post("/:id/document", upload.single("file"), uploadQRDocument);
router.post("/:id/attachments", upload.single("file"), uploadQRDocument);
router.delete("/:id", deleteQRCode);

module.exports = router;
