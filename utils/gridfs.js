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

const { generatePlaceholderPdf } = require("./pdfHelper");

/**
 * Upload a raw buffer to GridFS with a specific ObjectId (used for seeding GridFS files).
 *
 * @param {ObjectId|string} fileId - Target GridFS file ObjectId
 * @param {Buffer} buffer - File buffer
 * @param {string} filename - Target filename
 * @param {string} mimeType - File mime type
 * @returns {Promise<ObjectId>}
 */
const uploadBufferWithIdToGridFS = (fileId, buffer, filename, mimeType = "application/pdf") => {
    return new Promise((resolve, reject) => {
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: BUCKET_NAME,
        });

        const objectId = typeof fileId === "string" ? new mongoose.Types.ObjectId(fileId) : fileId;
        const readable = Readable.from(buffer);
        const uploadStream = bucket.openUploadStreamWithId(objectId, filename, {
            metadata: {
                contentType: mimeType,
                originalSize: buffer.length,
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
 * If the file is missing in GridFS, dynamically auto-generates & seeds a fallback PDF.
 *
 * @param {string} fileId - GridFS file ObjectId as string
 * @param {Object} res    - Express response object
 * @param {Object} [fallbackMeta] - Metadata for auto-generating PDF if file missing
 */
const downloadFromGridFS = async (fileId, res, fallbackMeta = {}) => {
    try {
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: BUCKET_NAME,
        });

        const objectId = new mongoose.Types.ObjectId(fileId);

        // Fetch file metadata first to set headers
        let files = await bucket.find({ _id: objectId }).toArray();
        
        // If file missing in GridFS on this DB, auto-seed a placeholder PDF with objectId
        if (!files || files.length === 0) {
            console.log(`[GridFS] File ${fileId} missing in DB. Generating & seeding fallback PDF...`);
            const pdfBuffer = generatePlaceholderPdf(
                fallbackMeta.title || "HFA QR Document",
                fallbackMeta.codeId || "QR Code",
                fallbackMeta.fileName || "Certificate.pdf"
            );

            await uploadBufferWithIdToGridFS(
                objectId,
                pdfBuffer,
                fallbackMeta.fileName || "Certificate.pdf",
                "application/pdf"
            );

            files = await bucket.find({ _id: objectId }).toArray();
        }

        const fileInfo = files && files.length > 0 ? files[0] : null;
        const contentType = fileInfo?.metadata?.contentType || "application/pdf";
        const filename = fileInfo?.filename || fallbackMeta.fileName || "Document.pdf";

        res.setHeader("Content-Type", contentType);
        res.setHeader(
            "Content-Disposition",
            `inline; filename="${encodeURIComponent(filename)}"`
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

module.exports = { uploadToGridFS, downloadFromGridFS, deleteFromGridFS, uploadBufferWithIdToGridFS };
