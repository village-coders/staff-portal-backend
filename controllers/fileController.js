const { downloadFromGridFS } = require("../utils/gridfs");
const { getS3Stream, extractS3Key } = require("../utils/s3");

/**
 * GET /api/v1/files/:id
 *
 * Streams a file from MongoDB GridFS to the client (legacy fallback).
 * The :id param is the GridFS file ObjectId (stored in attachment.fileUrl).
 *
 * Requires authentication (protect middleware applied in router).
 * Sets Content-Type and Content-Disposition headers automatically from GridFS metadata.
 */
const getFile = async (req, res, next) => {
    try {
        await downloadFromGridFS(req.params.id, res);
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/files/s3/*  (and /api/files/s3/*)
 *
 * Streams a file from AWS S3 to the client.
 */
const getS3File = async (req, res, next) => {
    try {
        const rawKey = req.params[0] || "";
        const key = extractS3Key(decodeURIComponent(rawKey)) || decodeURIComponent(rawKey);
        if (!key) {
            return res.status(400).json({ success: false, message: "Invalid S3 file key." });
        }

        const { stream, contentType, contentLength, filename } = await getS3Stream(key);

        res.setHeader("Content-Type", contentType);
        if (contentLength) {
            res.setHeader("Content-Length", contentLength);
        }
        res.setHeader(
            "Content-Disposition",
            `inline; filename="${encodeURIComponent(filename)}"`
        );

        stream.pipe(res);
        stream.on("error", () => {
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: "Error streaming file from S3.",
                });
            }
        });
    } catch (err) {
        if (!res.headersSent && (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404)) {
            return res.status(404).json({ success: false, message: "File not found in S3." });
        }
        next(err);
    }
};

module.exports = { getFile, getS3File };
