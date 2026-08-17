const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const QRUser = require("../models/QRUser");

/**
 * Helper to ensure default QR admin exists
 */
const ensureDefaultQRAdmin = async () => {
    const adminCount = await QRUser.countDocuments();
    if (adminCount === 0) {
        const hashedPassword = await bcrypt.hash("Admin@123", 12);
        await QRUser.create({
            username: "admin",
            password: hashedPassword,
            name: "HFA Admin",
            email: "admin@hfa.org",
            role: "admin",
            department: "Administration",
            active: true,
        });
        console.log("✅ Initialized default QR admin user (admin / Admin@123)");
    }
};

/**
 * POST /api/v1/qr-auth/login
 * Validates QRUser credentials and returns JWT token
 */
const qrLogin = async (req, res, next) => {
    try {
        await ensureDefaultQRAdmin();

        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username and password are required.",
            });
        }

        const user = await QRUser.findOne({ 
            username: { $regex: new RegExp(`^${username.trim()}$`, "i") } 
        }).select("+password");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid QR user credentials.",
            });
        }

        if (!user.active) {
            return res.status(403).json({
                success: false,
                message: "Your QR user account has been deactivated.",
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid QR user credentials.",
            });
        }

        const payload = { id: user._id, role: user.role };
        const token = jwt.sign(payload, process.env.JWT_SECRET || "default_jwt_secret", {
            expiresIn: process.env.JWT_EXPIRES_IN || "7d",
        });

        res.cookie("qr_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        const userObj = user.toJSON();

        res.status(200).json({
            success: true,
            message: "QR Login successful.",
            token,
            data: userObj,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/qr-auth/me
 */
const qrGetMe = (req, res) => {
    res.status(200).json({ success: true, data: req.user });
};

/**
 * POST /api/v1/qr-auth/logout
 */
const qrLogout = (req, res) => {
    res.clearCookie("qr_token");
    res.status(200).json({ success: true, message: "Logged out from QR Portal." });
};

module.exports = { qrLogin, qrGetMe, qrLogout, ensureDefaultQRAdmin };
