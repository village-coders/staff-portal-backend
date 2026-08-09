const jwt = require("jsonwebtoken");
const User = require("../models/users");

/**
 * protect middleware
 *
 * Verifies JWT from Bearer Authorization header or httpOnly cookie.
 * Attaches the full user document (password excluded) to req.user.
 * Also validates that the user account is still active.
 */
const protect = async (req, res, next) => {
    try {
        let token;

        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer ")
        ) {
            token = req.headers.authorization.split(" ")[1];
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Not authorized. No token provided.",
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Fetch from DB so we always have the latest role & active status
        const user = await User.findById(decoded.id).select("-password");
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User associated with this token no longer exists.",
            });
        }

        if (!user.active) {
            return res.status(403).json({
                success: false,
                message: "Your account has been deactivated. Contact an administrator.",
            });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token.",
        });
    }
};

/**
 * authorize middleware factory
 *
 * Returns a middleware that restricts access to users with one of the specified roles.
 *
 * @param {...string} roles - Allowed roles
 * @returns {Function} Express middleware
 *
 * @example
 *   router.get('/', protect, authorize('admin'), getUsers);
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Role '${req.user.role}' is not permitted to perform this action.`,
            });
        }
        next();
    };
};

module.exports = { protect, authorize };