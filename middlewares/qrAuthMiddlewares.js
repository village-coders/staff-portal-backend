const jwt = require("jsonwebtoken");
const QRUser = require("../models/QRUser");

/**
 * protectQR middleware
 *
 * Verifies JWT from Bearer Authorization header or httpOnly cookie,
 * checks against the QRUser collection.
 */
const protectQR = async (req, res, next) => {
    try {
        let token;

        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer ")
        ) {
            token = req.headers.authorization.split(" ")[1];
        } else if (req.cookies && req.cookies.qr_token) {
            token = req.cookies.qr_token;
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Not authorized. No token provided for QR Portal.",
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const qrUser = await QRUser.findById(decoded.id).select("-password");
        if (!qrUser) {
            return res.status(401).json({
                success: false,
                message: "QR User associated with this token no longer exists.",
            });
        }

        if (!qrUser.active) {
            return res.status(403).json({
                success: false,
                message: "Your QR user account has been deactivated. Contact an administrator.",
            });
        }

        req.user = qrUser;
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: "Not authorized. Invalid or expired token.",
        });
    }
};

/**
 * authorizeQR middleware
 */
const authorizeQR = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Forbidden: role '${req.user ? req.user.role : "none"}' does not have permission.`,
            });
        }
        next();
    };
};

module.exports = { protectQR, authorizeQR };
