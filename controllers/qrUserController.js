const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const QRUser = require("../models/QRUser");

/**
 * GET /api/v1/qr-users
 * List all QR Portal users (Admin only)
 */
const getQRUsers = async (req, res, next) => {
    try {
        const users = await QRUser.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: users.length,
            data: users,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/v1/qr-users
 * Create a new QR Portal user (Admin only)
 */
const createQRUser = async (req, res, next) => {
    try {
        const { name, username, password, email, role, department } = req.body;

        if (!name || !username || !password || !email) {
            return res.status(400).json({
                success: false,
                message: "Name, username, password, and email are required.",
            });
        }

        const existingUsername = await QRUser.findOne({ 
            username: { $regex: new RegExp(`^${username.trim()}$`, "i") } 
        });
        if (existingUsername) {
            return res.status(400).json({
                success: false,
                message: `Username '${username}' is already in use.`,
            });
        }

        const existingEmail = await QRUser.findOne({ 
            email: { $regex: new RegExp(`^${email.trim()}$`, "i") } 
        });
        if (existingEmail) {
            return res.status(400).json({
                success: false,
                message: `Email '${email}' is already in use.`,
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const qrUser = await QRUser.create({
            name: name.trim(),
            username: username.trim(),
            password: hashedPassword,
            email: email.trim().toLowerCase(),
            role: role === "admin" ? "admin" : "user",
            department: department ? department.trim() : "",
            active: true,
        });

        res.status(201).json({
            success: true,
            message: "QR User created successfully.",
            data: qrUser,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/v1/qr-users/:id
 */
const updateQRUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, email, role, department, active, password } = req.body;

        const queryConditions = [{ username: id }];
        if (mongoose.isValidObjectId(id)) {
            queryConditions.push({ _id: id });
        }

        const user = await QRUser.findOne({ $or: queryConditions });
        if (!user) {
            return res.status(404).json({ success: false, message: "QR User not found." });
        }

        if (name !== undefined) user.name = name.trim();
        if (email !== undefined) user.email = email.trim().toLowerCase();
        if (role !== undefined) user.role = role;
        if (department !== undefined) user.department = department;
        if (active !== undefined) user.active = active;
        if (password && password.trim() !== "") {
            user.password = await bcrypt.hash(password, 12);
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: "QR User updated successfully.",
            data: user,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/v1/qr-users/:id
 */
const deleteQRUser = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (req.user && (req.user._id.toString() === id || req.user.username === id)) {
            return res.status(400).json({
                success: false,
                message: "You cannot delete your own QR admin account.",
            });
        }

        const queryConditions = [{ username: id }];
        if (mongoose.isValidObjectId(id)) {
            queryConditions.push({ _id: id });
        }

        const user = await QRUser.findOneAndDelete({ $or: queryConditions });
        if (!user) {
            return res.status(404).json({ success: false, message: "QR User not found." });
        }

        res.status(200).json({ success: true, message: "QR User deleted successfully." });
    } catch (err) {
        next(err);
    }
};

module.exports = { getQRUsers, createQRUser, updateQRUser, deleteQRUser };
