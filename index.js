require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectToDb = require("./config/connectToDb");
const errorHandler = require("./middlewares/errorHandler");

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Core Middleware ──────────────────────────────────────────────────────────
app.use(
    cors({
        origin: process.env.CLIENT_URL || "*",
        credentials: true,
    })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "HFA Staff Portal API v1 — Running ✅",
        timestamp: new Date().toISOString(),
        endpoints: {
            auth: "/api/v1/auth",
            users: "/api/v1/users",
            claims: "/api/v1/claims",
            assets: "/api/v1/assets",
            notifications: "/api/v1/notifications",
            files: "/api/v1/files",
        },
    });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/v1/auth", require("./routers/authRouter"));
app.use("/api/v1/users", require("./routers/userRouter"));
app.use("/api/v1/claims", require("./routers/claimRouter"));
app.use("/api/v1/assets", require("./routers/assetRouter"));
app.use("/api/v1/notifications", require("./routers/notificationRouter"));
app.use("/api/v1/files", require("./routers/fileRouter"));

// ─── 404 Catch-All ────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route '${req.method} ${req.originalUrl}' not found.`,
    });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Connect to DB, then Start Server ────────────────────────────────────────
connectToDb().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀  Server running  → http://localhost:${PORT}`);
        console.log(`📦  Environment     → ${process.env.NODE_ENV || "development"}`);
        console.log(`🗄️   Database        → ${process.env.DB_NAME}`);
    });
});