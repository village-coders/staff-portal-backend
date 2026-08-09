const express = require("express");
const { login, logout, getMe } = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddlewares");

const router = express.Router();

// POST /api/v1/auth/login
router.post("/login", login);

// POST /api/v1/auth/logout
router.post("/logout", logout);

// GET /api/v1/auth/me  — requires valid token
router.get("/me", protect, getMe);

module.exports = router;
