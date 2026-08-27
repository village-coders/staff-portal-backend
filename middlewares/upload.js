const multer = require("multer");

const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024; // 30 MB

/**
 * Filter function — only allow permitted MIME types
 */
const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            new Error(
                `Unsupported file type '${file.mimetype}'. Allowed: images (JPEG/PNG/WebP), PDF, Word, Excel.`
            ),
            false
        );
    }
};

/**
 * Memory storage — files are held in buffer and uploaded to GridFS in the controller.
 * No files are ever written to the local filesystem.
 */
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE_BYTES },
    fileFilter,
});

module.exports = upload;
