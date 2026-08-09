const Notification = require("../models/Notification");

/**
 * GET /api/v1/notifications
 * Returns paginated notifications for the authenticated user.
 * Includes unread count in the response.
 */
const getNotifications = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const onlyUnread = req.query.unread === "true";

        const baseQuery = { recipientId: req.user._id };
        if (onlyUnread) baseQuery.read = false;

        const total = await Notification.countDocuments(baseQuery);
        const unreadCount = await Notification.countDocuments({
            recipientId: req.user._id,
            read: false,
        });

        const notifications = await Notification.find(baseQuery)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("claimId", "claimRefNo status claimType");

        res.status(200).json({
            success: true,
            count: total,
            unreadCount,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                pageSize: limit,
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1,
            },
            data: notifications,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * PATCH /api/v1/notifications/mark-read
 * Marks all unread notifications for the authenticated user as read.
 */
const markAllRead = async (req, res, next) => {
    try {
        const result = await Notification.updateMany(
            { recipientId: req.user._id, read: false },
            { $set: { read: true } }
        );

        res.status(200).json({
            success: true,
            message: `${result.modifiedCount} notification(s) marked as read.`,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * PATCH /api/v1/notifications/:id/mark-read
 * Marks a single notification as read.
 */
const markOneRead = async (req, res, next) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipientId: req.user._id },
            { $set: { read: true } },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found.",
            });
        }

        res.status(200).json({
            success: true,
            message: "Notification marked as read.",
            data: notification,
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { getNotifications, markAllRead, markOneRead };
