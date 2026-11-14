const express = require("express");
const { getFile, getS3File } = require("../controllers/fileController");

const router = express.Router();

// GET /api/v1/files/s3/* (and /api/files/s3/*) — stream a file from AWS S3
router.get(/^\/s3\/(.+)$/, getS3File);

// GET /api/v1/files/:id  — stream a file from GridFS (legacy fallback, supports inline display for PDFs/images)
// :id is the GridFS file ObjectId (stored in attachment.fileUrl)
router.get("/:id", getFile);
router.get("/public/:id", getFile);

module.exports = router;
