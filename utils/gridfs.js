const mongoose = require("mongoose");
const { Readable } = require("stream");

const BUCKET_NAME = "uploads";

/**
 * Upload a file buffer (from multer memoryStorage) to MongoDB GridFS.
 *
 * @param {Object} file - Multer file object ({ buffer, originalname, mimetype, size })
 * @returns {Promise<ObjectId>} - GridFS file _id
 */
const uploadToGridFS = (file) => {
    return new Promise((resolve, reject) => {
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: BUCKET_NAME,
        });

        const readable = Readable.from(file.buffer);
        const uploadStream = bucket.openUploadStream(file.originalname, {
            metadata: {
                contentType: file.mimetype,
                originalSize: file.size,
            },
        });

        readable.pipe(uploadStream);
        uploadStream.on("finish", () => resolve(uploadStream.id));
        uploadStream.on("error", reject);
    });
};

/**
 * Stream a file from GridFS directly into an Express response.
 * Sets appropriate Content-Type and Content-Disposition headers.
 *
 * @param {string} fileId - GridFS file ObjectId as string
 * @param {Object} res    - Express response object
 */
const downloadFromGridFS = async (fileId, res) => {
    try {
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: BUCKET_NAME,
        });

        const objectId = new mongoose.Types.ObjectId(fileId);

        // Fetch file metadata first to set headers
        const files = await bucket.find({ _id: objectId }).toArray();
        if (!files || files.length === 0) {
            return res
                .status(404)
                .json({ success: false, message: "File not found." });
        }

        const fileInfo = files[0];
        res.setHeader(
            "Content-Type",
            fileInfo.metadata?.contentType || "application/octet-stream"
        );
        res.setHeader(
            "Content-Disposition",
            `inline; filename="${encodeURIComponent(fileInfo.filename)}"`
        );

        const downloadStream = bucket.openDownloadStream(objectId);
        downloadStream.pipe(res);

        downloadStream.on("error", () => {
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: "Error streaming file from storage.",
                });
            }
        });
    } catch (err) {
        if (!res.headersSent) {
            if (err.name === "BSONError" || err.name === "BSONTypeError") {
                return res
                    .status(400)
                    .json({ success: false, message: "Invalid file ID format." });
            }
            res.status(500).json({ success: false, message: "GridFS error." });
        }
    }
};

/**
 * Delete a file from GridFS by its ObjectId.
 *
 * @param {string} fileId - GridFS file ObjectId as string
 */
const deleteFromGridFS = async (fileId) => {
    try {
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: BUCKET_NAME,
        });
        await bucket.delete(new mongoose.Types.ObjectId(fileId));
    } catch (err) {
        console.error("[GridFS Delete Error]", err.message);
    }
};

module.exports = { uploadToGridFS, downloadFromGridFS, deleteFromGridFS };
