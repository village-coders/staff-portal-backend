const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/users");

/**
 * POST /api/v1/auth/login
 * Validates credentials and issues a JWT via both cookie and response body.
 */
const login = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username and password are required.",
            });
        }

        // Must select password explicitly (schema uses select: false)
        const user = await User.findOne({ username }).select("+password");
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials.",
            });
        }

        if (!user.active) {
            return res.status(403).json({
                success: false,
                message: "Your account has been deactivated. Contact an administrator.",
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials.",
            });
        }

        const payload = { id: user._id };
        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || "7d",
        });

        // Set httpOnly cookie (for browser clients)
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
        });

        // Return user object without password
        const userObj = user.toJSON();

        res.status(200).json({
            success: true,
            message: "Login successful.",
            token,
            data: userObj,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/v1/auth/logout
 * Clears the authentication cookie.
 */
const logout = (req, res) => {
    res.clearCookie("token");
    res.status(200).json({ success: true, message: "Logged out successfully." });
};

/**
 * GET /api/v1/auth/me
 * Returns the authenticated user's profile (req.user set by protect middleware).
 */
const getMe = (req, res) => {
    res.status(200).json({ success: true, data: req.user });
};

module.exports = { login, logout, getMe };
