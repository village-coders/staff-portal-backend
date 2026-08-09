const mongoose = require("mongoose");
const Asset = require("../models/Asset");
const generateSerialNumber = require("../utils/generateSerialNumber");
const { uploadToGridFS } = require("../utils/gridfs");

/**
 * GET /api/v1/assets
 * List all assets — paginated with search by name, serial, category, department.
 */
const getAssets = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const search = req.query.search || "";
        const statusFilter = req.query.status || "";

        const searchFilter = search
            ? {
                  $or: [
                      { assetName: { $regex: search, $options: "i" } },
                      { serialNumber: { $regex: search, $options: "i" } },
                      { category: { $regex: search, $options: "i" } },
                      { staffName: { $regex: search, $options: "i" } },
                      { department: { $regex: search, $options: "i" } },
                  ],
              }
            : {};

        const statusCondition = statusFilter ? { status: statusFilter } : {};
        const query = { ...searchFilter, ...statusCondition };

        const total = await Asset.countDocuments(query);
        const assets = await Asset.find(query)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: total,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                pageSize: limit,
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1,
            },
            data: assets,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/v1/assets
 * Register a new asset. Serial number is auto-generated.
 */
const createAsset = async (req, res, next) => {
    try {
        const {
            assetName,
            staffName,
            category,
            department,
            acquisitionDate,
            expiryDate,
            amount,
            sellerVendor,
            status,
        } = req.body;

        if (!assetName || !staffName || amount === undefined) {
            return res.status(400).json({
                success: false,
                message: "assetName, staffName, and amount are required.",
            });
        }

        const serialNumber = await generateSerialNumber();

        const asset = await Asset.create({
            serialNumber,
            assetName,
            staffName,
            category,
            department,
            acquisitionDate,
            expiryDate,
            amount,
            sellerVendor,
            status,
        });

        res.status(201).json({
            success: true,
            message: "Asset registered successfully.",
            data: asset,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/assets/:id
 * Get a single asset by MongoDB ObjectId or serialNumber.
 */
const getAssetById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const queryConditions = [{ serialNumber: id }];
        if (mongoose.isValidObjectId(id)) {
            queryConditions.push({ _id: id });
        }

        const asset = await Asset.findOne({ $or: queryConditions });
        if (!asset) {
            return res.status(404).json({ success: false, message: "Asset not found." });
        }

        res.status(200).json({ success: true, data: asset });
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/v1/assets/:id
 * Update asset details. Serial number cannot be changed.
 */
const updateAsset = async (req, res, next) => {
    try {
        // Prevent serial number updates
        const { serialNumber, ...updates } = req.body;

        if (Object.keys(updates).length === 0) {
            return res
                .status(400)
                .json({ success: false, message: "No valid fields to update." });
        }

        const asset = await Asset.findByIdAndUpdate(req.params.id, updates, {
            new: true,
            runValidators: true,
        });

        if (!asset) {
            return res.status(404).json({ success: false, message: "Asset not found." });
        }

        res.status(200).json({
            success: true,
            message: "Asset updated successfully.",
            data: asset,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/v1/assets/:id/attachments
 * Upload files for an asset and store them in GridFS.
 */
const uploadAssetAttachments = async (req, res, next) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res
                .status(400)
                .json({ success: false, message: "No files were uploaded." });
        }

        const asset = await Asset.findById(req.params.id);
        if (!asset) {
            return res.status(404).json({ success: false, message: "Asset not found." });
        }

        const uploadedAttachments = [];

        for (const file of req.files) {
            const gridFsId = await uploadToGridFS(file);
            const attachment = {
                fileName: file.originalname,
                fileUrl: gridFsId.toString(),
                fileSize: `${(file.size / 1024).toFixed(2)} KB`,
                uploadedAt: new Date(),
            };
            asset.attachments.push(attachment);
            uploadedAttachments.push(attachment);
        }

        await asset.save();

        res.status(200).json({
            success: true,
            message: `${uploadedAttachments.length} file(s) uploaded to asset.`,
            data: uploadedAttachments,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/v1/assets/:id
 * Delete an asset (Admin / Super Admin only).
 */
const deleteAsset = async (req, res, next) => {
    try {
        const asset = await Asset.findByIdAndDelete(req.params.id);
        if (!asset) {
            return res.status(404).json({ success: false, message: "Asset not found." });
        }
        res.status(200).json({ success: true, message: "Asset deleted successfully." });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getAssets,
    createAsset,
    getAssetById,
    updateAsset,
    uploadAssetAttachments,
    deleteAsset,
};
