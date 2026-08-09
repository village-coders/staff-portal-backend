const Notification = require("../models/Notification");
const User = require("../models/users");

/**
 * Send a notification to a single recipient.
 *
 * @param {Object} options
 * @param {ObjectId|string} options.recipientId  - Target user ID
 * @param {string} [options.type="general"]      - Notification type
 * @param {string} options.title                 - Notification title
 * @param {string} options.message               - Notification body
 * @param {ObjectId|string|null} [options.claimId] - Optional linked claim ID
 */
const sendNotification = async ({
    recipientId,
    type = "general",
    title,
    message,
    claimId = null,
}) => {
    try {
        await Notification.create({ recipientId, type, title, message, claimId });
    } catch (err) {
        // Non-fatal — log and continue
        console.error("[Notification Error] sendNotification:", err.message);
    }
};

/**
 * Send a notification to ALL active users with a given role.
 *
 * @param {Object} options
 * @param {string} options.role                  - Target role
 * @param {string} [options.type="general"]      - Notification type
 * @param {string} options.title                 - Notification title
 * @param {string} options.message               - Notification body
 * @param {ObjectId|string|null} [options.claimId] - Optional linked claim ID
 */
const sendNotificationToRole = async ({
    role,
    type = "general",
    title,
    message,
    claimId = null,
}) => {
    try {
        const users = await User.find({ role, active: true }).select("_id");
        if (!users.length) return;

        await Promise.all(
            users.map((u) =>
                sendNotification({
                    recipientId: u._id,
                    type,
                    title,
                    message,
                    claimId,
                })
            )
        );
    } catch (err) {
        console.error("[Notification Error] sendNotificationToRole:", err.message);
    }
};

module.exports = { sendNotification, sendNotificationToRole };
