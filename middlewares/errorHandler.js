/**
 * Global Express error handler
 *
 * Catches errors forwarded via next(err) from any async controller.
 * Normalizes Mongoose, JWT, and generic errors into standard API response shape.
 */
const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";

    // ── Mongoose: duplicate key (unique constraint violation) ─────────────────
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || "field";
        message = `A record with that ${field} already exists. Please use a different value.`;
        statusCode = 400;
    }

    // ── Mongoose: schema validation errors ───────────────────────────────────
    if (err.name === "ValidationError") {
        message = Object.values(err.errors)
            .map((e) => e.message)
            .join(", ");
        statusCode = 400;
    }

    // ── Mongoose: invalid ObjectId cast ──────────────────────────────────────
    if (err.name === "CastError") {
        message = `Invalid ID format: '${err.value}'.`;
        statusCode = 400;
    }

    // ── JWT errors ────────────────────────────────────────────────────────────
    if (err.name === "JsonWebTokenError") {
        message = "Invalid token. Please log in again.";
        statusCode = 401;
    }

    if (err.name === "TokenExpiredError") {
        message = "Token has expired. Please log in again.";
        statusCode = 401;
    }

    // ── Multer file size error ────────────────────────────────────────────────
    if (err.code === "LIMIT_FILE_SIZE") {
        message = "File too large. Maximum upload size is 10 MB per file.";
        statusCode = 400;
    }

    // Log in development
    if (process.env.NODE_ENV === "development") {
        console.error(`[ERROR] ${statusCode} — ${message}\n`, err.stack || "");
    } else {
        console.error(`[ERROR] ${statusCode} — ${message}`);
    }

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
};

module.exports = errorHandler;
