const express = require("express");
const {
    getUsers,
    createUser,
    updateUser,
    deleteUser,
} = require("../controllers/userController");
const { protect, authorize } = require("../middlewares/authMiddlewares");

const router = express.Router();

// All user management routes require auth + admin/super_admin role
router.use(protect, authorize("admin", "super_admin"));

// GET  /api/v1/users          — list all users (paginated)
router.get("/", getUsers);

// POST /api/v1/users          — create a new user
router.post("/", createUser);

// PUT  /api/v1/users/:id      — update user details (not password)
router.put("/:id", updateUser);

// DELETE /api/v1/users/:id    — delete user account
router.delete("/:id", deleteUser);

module.exports = router;
