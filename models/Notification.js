const { Schema, model, Types } = require("mongoose");

const notificationSchema = new Schema(
    {
        recipientId: {
            type: Types.ObjectId,
            ref: "User",
            required: [true, "Recipient is required"],
            index: true,
        },
        type: {
            type: String,
            enum: ["claim", "verified", "pending", "paid", "asset", "general"],
            default: "general",
        },
        title: {
            type: String,
            required: [true, "Notification title is required"],
        },
        message: {
            type: String,
            required: [true, "Notification message is required"],
        },
        read: {
            type: Boolean,
            default: false,
        },
        claimId: {
            type: Types.ObjectId,
            ref: "Claim",
            default: null,
        },
    },
    { timestamps: true }
);

const Notification = model("Notification", notificationSchema);
module.exports = Notification;
