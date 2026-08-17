const mongoose = require("mongoose");
const QRCode = require("../models/QRCode");
const { uploadToGridFS, downloadFromGridFS, deleteFromGridFS } = require("../utils/gridfs");

/**
 * Generate unique human-readable codeId (e.g., QR-849201)
 */
const generateCodeId = async (prefix = "QR") => {
    let unique = false;
    let codeId = "";
    while (!unique) {
        const rand = Math.floor(100000 + Math.random() * 900000);
        codeId = `${prefix}-${rand}`;
        const existing = await QRCode.findOne({ codeId });
        if (!existing) unique = true;
    }
    return codeId;
};

/**
 * POST /api/v1/qrcodes
 * Create a new dynamic QR code — NO initial details required!
 */
const createQRCode = async (req, res, next) => {
    try {
        const { codeId: customCodeId, title, createdByName, createdBy } = req.body || {};

        let codeId = customCodeId && customCodeId.trim();
        if (codeId) {
            const existing = await QRCode.findOne({ codeId });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: `Code ID '${codeId}' is already taken.`,
                });
            }
        } else {
            codeId = await generateCodeId("QR");
        }

        const qrTitle = title && title.trim() ? title.trim() : `QR Code ${codeId}`;
        const creator = (createdByName && createdByName.trim()) || req.user?.name || req.user?.username || "Admin";
        const creatorId = createdBy || req.user?._id;

        const qrCode = await QRCode.create({
            codeId,
            title: qrTitle,
            createdByName: creator,
            createdBy: creatorId,
            attachments: [],
        });

        res.status(201).json({
            success: true,
            message: "QR Code generated successfully.",
            data: qrCode,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/qrcodes
 * List all generated QR codes
 */
const getQRCodes = async (req, res, next) => {
    try {
        const qrCodes = await QRCode.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: qrCodes.length,
            data: qrCodes,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/qrcodes/:id
 * Get QR code details
 */
const getQRCodeById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const queryConditions = [{ codeId: id }];
        if (mongoose.isValidObjectId(id)) {
            queryConditions.push({ _id: id });
        }

        const qrCode = await QRCode.findOne({ $or: queryConditions });
        if (!qrCode) {
            return res.status(404).json({
                success: false,
                message: "QR Code not found.",
            });
        }

        res.status(200).json({
            success: true,
            data: qrCode,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/qrcodes/public/:codeId
 * Public scan endpoint — increments scan count & timestamp
 */
const getPublicQRCode = async (req, res, next) => {
    try {
        const { codeId } = req.params;
        const queryConditions = [{ codeId }];
        if (mongoose.isValidObjectId(codeId)) {
            queryConditions.push({ _id: codeId });
        }

        const qrCode = await QRCode.findOneAndUpdate(
            { $or: queryConditions },
            {
                $inc: { scanCount: 1 },
                $set: { lastScannedAt: new Date() },
            },
            { new: true }
        );

        if (!qrCode) {
            return res.status(404).json({
                success: false,
                message: "Scanned QR Code was not found.",
            });
        }

        res.status(200).json({
            success: true,
            data: qrCode,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/qrcodes/scan/:codeId
 * Direct scanner stream endpoint — streams the uploaded document directly from GridFS
 */
const streamPublicQRDocument = async (req, res, next) => {
    try {
        const { codeId } = req.params;
        const queryConditions = [{ codeId }];
        if (mongoose.isValidObjectId(codeId)) {
            queryConditions.push({ _id: codeId });
        }

        const qrCode = await QRCode.findOneAndUpdate(
            { $or: queryConditions },
            {
                $inc: { scanCount: 1 },
                $set: { lastScannedAt: new Date() },
            },
            { new: true }
        );

        if (!qrCode || !qrCode.attachments || qrCode.attachments.length === 0) {
            return res.status(404).send("No document uploaded for this QR code yet.");
        }

        const attachment = qrCode.attachments[0];
        await downloadFromGridFS(attachment.fileUrl, res);
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/v1/qrcodes/:id/document
 * Upload or replace the document for a QR code stored in MongoDB GridFS
 */
const uploadQRDocument = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!req.file && (!req.files || req.files.length === 0)) {
            return res.status(400).json({
                success: false,
                message: "No document was uploaded.",
            });
        }

        const file = req.file || req.files[0];

        const queryConditions = [{ codeId: id }];
        if (mongoose.isValidObjectId(id)) {
            queryConditions.push({ _id: id });
        }

        const qrCode = await QRCode.findOne({ $or: queryConditions });
        if (!qrCode) {
            return res.status(404).json({
                success: false,
                message: "QR Code not found.",
            });
        }

        // If there was a previous document, clean it up from GridFS
        if (qrCode.attachments && qrCode.attachments.length > 0) {
            for (const oldAtt of qrCode.attachments) {
                if (oldAtt.fileUrl) {
                    await deleteFromGridFS(oldAtt.fileUrl);
                }
            }
            qrCode.attachments = [];
        }

        // Upload new file to GridFS
        const gridFsId = await uploadToGridFS(file);
        const sizeInKB = (file.size / 1024).toFixed(1);
        const sizeDisplay = file.size > 1024 * 1024 
            ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` 
            : `${sizeInKB} KB`;

        const newAttachment = {
            fileName: file.originalname,
            fileUrl: gridFsId.toString(),
            fileSize: sizeDisplay,
            mimeType: file.mimetype,
            uploadedAt: new Date(),
        };

        qrCode.attachments.push(newAttachment);
        await qrCode.save();

        res.status(200).json({
            success: true,
            message: "Document uploaded to MongoDB GridFS successfully.",
            data: qrCode,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/v1/qrcodes/:id
 * Delete QR code and purge all associated GridFS attachments
 */
const deleteQRCode = async (req, res, next) => {
    try {
        const { id } = req.params;
        const queryConditions = [{ codeId: id }];
        if (mongoose.isValidObjectId(id)) {
            queryConditions.push({ _id: id });
        }

        const qrCode = await QRCode.findOne({ $or: queryConditions });
        if (!qrCode) {
            return res.status(404).json({
                success: false,
                message: "QR Code not found.",
            });
        }

        // Clean up GridFS files
        if (qrCode.attachments && qrCode.attachments.length > 0) {
            for (const att of qrCode.attachments) {
                if (att.fileUrl) {
                    await deleteFromGridFS(att.fileUrl);
                }
            }
        }

        await QRCode.findByIdAndDelete(qrCode._id);

        res.status(200).json({
            success: true,
            message: "QR Code deleted successfully.",
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    createQRCode,
    getQRCodes,
    getQRCodeById,
    getPublicQRCode,
    streamPublicQRDocument,
    uploadQRDocument,
    deleteQRCode,
};
