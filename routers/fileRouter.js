const express = require("express");
const { getFile } = require("../controllers/fileController");
const { protect } = require("../middlewares/authMiddlewares");

const router = express.Router();

// GET /api/v1/files/:id  — stream a file from GridFS
// :id is the GridFS file ObjectId (stored in attachment.fileUrl)
router.get("/:id", protect, getFile);

module.exports = router;
