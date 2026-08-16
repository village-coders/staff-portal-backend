const express = require("express");
const { getFile } = require("../controllers/fileController");

const router = express.Router();

// GET /api/v1/files/:id  — stream a file from GridFS (supports inline display for PDFs/images)
// :id is the GridFS file ObjectId (stored in attachment.fileUrl)
router.get("/:id", getFile);
router.get("/public/:id", getFile);

module.exports = router;
