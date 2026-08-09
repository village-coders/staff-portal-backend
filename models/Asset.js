const { Schema, model } = require("mongoose");

const attachmentSchema = new Schema(
    {
        fileName: { type: String },
        fileUrl: { type: String }, // GridFS ObjectId stored as string
        fileSize: { type: String },
        uploadedAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const assetSchema = new Schema(
    {
        serialNumber: {
            type: String,
            unique: true,
            required: [true, "Serial number is required"],
            index: true,
            // Auto-generated format: SN-AST-XXXXXXXX-X000
        },
        assetName: {
            type: String,
            required: [true, "Asset name is required"],
            trim: true,
        },
        staffName: {
            type: String,
            required: [true, "Staff name is required"],
        },
        category: { type: String, trim: true },
        department: { type: String, trim: true },
        acquisitionDate: { type: Date },
        expiryDate: { type: Date },
        amount: {
            type: Number,
            required: [true, "Asset amount is required"],
        },
        sellerVendor: { type: String },
        status: {
            type: String,
            enum: ["Active", "Retired", "Maintenance"],
            default: "Active",
        },
        attachments: [attachmentSchema],
    },
    { timestamps: true }
);

const Asset = model("Asset", assetSchema);
module.exports = Asset;
