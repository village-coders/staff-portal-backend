const express = require("express");
const {
    getNotifications,
    markAllRead,
    markOneRead,
} = require("../controllers/notificationController");
const { protect } = require("../middlewares/authMiddlewares");

const router = express.Router();

// All notification routes require authentication
router.use(protect);

// GET   /api/v1/notifications              — get user's notifications (paginated)
// Query: ?unread=true  to filter unread only
router.get("/", getNotifications);

// PATCH /api/v1/notifications/mark-read    — mark ALL user notifications as read
router.patch("/mark-read", markAllRead);

// PATCH /api/v1/notifications/:id/mark-read — mark a single notification as read
router.patch("/:id/mark-read", markOneRead);

module.exports = router;
