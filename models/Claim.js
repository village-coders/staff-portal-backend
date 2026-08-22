const { Schema, model, Types } = require("mongoose");

// ─── Sub-Schemas ─────────────────────────────────────────────────────────────

const historyEntrySchema = new Schema(
    {
        actorId: { type: Types.ObjectId, ref: "User" },
        actorName: { type: String },
        actorRole: { type: String },
        fromStatus: { type: String, default: null },
        toStatus: { type: String },
        note: { type: String, default: "" },
        targetRole: { type: String },
        timestamp: { type: Date, default: Date.now },
    },
    { _id: false }
);

const attachmentSchema = new Schema(
    {
        fileName: { type: String },
        fileUrl: { type: String }, // GridFS ObjectId stored as string
        fileSize: { type: String },
        uploadedAt: { type: Date, default: Date.now },
    },
    { _id: false }
);

const reasonSchema = new Schema(
    {
        option: { type: String }, // e.g. "Overseas Travel", "Training", "Meeting"
        chg: { type: Boolean, default: false }, // Chargeable indicator
    },
    { _id: false }
);

const itemSchema = new Schema(
    {
        type: {
            type: String,
            enum: ["None", "In Budget", "Not In Budget", "Not Applicable"],
            default: "None",
        },
        category: { type: String, required: [true, "Item category is required"] },
        currency: {
            type: String,
            enum: ["GBP", "USD", "EUR"],
            default: "GBP",
        },
        payMode: {
            type: String,
            enum: ["card", "cash"],
            default: "cash",
        },
        card: { type: Number, default: 0 },
        cash: { type: Number, default: 0 },
        vat: { type: Number, default: 0 },
        total: { type: Number, required: [true, "Item total is required"] },
        note: { type: String },
    },
    { _id: false }
);

const subtotalsSchema = new Schema(
    {
        subtotalCard: { type: Number, default: 0 },
        subtotalCash: { type: Number, default: 0 },
        subtotalVat: { type: Number, default: 0 },
        grandTotal: { type: Number, required: [true, "Grand total is required"] },
    },
    { _id: false }
);

// ─── Main Claim Schema ────────────────────────────────────────────────────────

const claimSchema = new Schema(
    {
        claimRefNo: {
            type: String,
            unique: true,
            required: [true, "Claim reference number is required"],
            index: true,
        },
        claimantId: {
            type: Types.ObjectId,
            ref: "User",
            required: [true, "Claimant is required"],
        },
        claimantName: {
            type: String,
            required: [true, "Claimant name is required"],
        },
        department: {
            type: String,
            required: [true, "Department is required"],
        },
        claimType: {
            type: String,
            required: [true, "Claim type is required"],
            // e.g. Audit, Supervision, Meeting, Miscellaneous, Approved Supplier IT/Admin
        },
        filingDate: {
            type: Date,
            required: [true, "Filing date is required"],
        },
        companyName: {
            type: String,
            default: "Halal Food Authority",
        },
        contactPerson: { type: String },
        contactEmail: { type: String },
        reasons: [reasonSchema],
        items: [itemSchema],
        subtotals: subtotalsSchema,
        attachments: [attachmentSchema],
        status: {
            type: String,
            enum: [
                "NEW",
                "PENDING",
                "VERIFIED",
                "FURTHER_APPROVAL",
                "APPROVED_FOR_PAYMENT",
                "PAID",
                "REJECTED",
            ],
            default: "NEW",
        },
        officerNote: {
            type: String,
            default: "",
        },
        history: [historyEntrySchema],
    },
    { timestamps: true }
);

const Claim = model("Claim", claimSchema);
module.exports = Claim;
