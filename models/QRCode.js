const { Schema, model } = require("mongoose");

const attachmentSchema = new Schema(
    {
        fileName: { type: String, required: true },
        fileUrl: { type: String, required: true }, // GridFS ObjectId stored as string
        fileSize: { type: String },
        mimeType: { type: String },
        uploadedAt: { type: Date, default: Date.now },
    },
    { _id: true }
);

const qrCodeSchema = new Schema(
    {
        codeId: {
            type: String,
            unique: true,
            required: [true, "Code ID is required"],
            index: true,
            trim: true,
        },
        title: {
            type: String,
            default: function () {
                return `QR Code ${this.codeId || ""}`;
            },
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            default: "",
        },
        // GridFS uploaded attachment (PDF, Word, Image, Document)
        attachments: [attachmentSchema],
        // Analytics
        scanCount: {
            type: Number,
            default: 0,
        },
        lastScannedAt: {
            type: Date,
        },
    },
    { timestamps: true }
);

const QRCode = model("QRCode", qrCodeSchema);
module.exports = QRCode;
