const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/users");

/**
 * GET /api/v1/users
 * List all users — paginated with optional search (Admin only)
 */
const getUsers = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const search = req.query.search || "";
        const roleFilter = req.query.role || "";

        const searchFilter = search
            ? {
                  $or: [
                      { name: { $regex: search, $options: "i" } },
                      { username: { $regex: search, $options: "i" } },
                      { email: { $regex: search, $options: "i" } },
                      { department: { $regex: search, $options: "i" } },
                  ],
              }
            : {};

        const roleCondition = roleFilter ? { role: roleFilter } : {};
        const query = { ...searchFilter, ...roleCondition };

        const total = await User.countDocuments(query);
        const users = await User.find(query)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: total,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                pageSize: limit,
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1,
            },
            data: users,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/v1/users
 * Create a new user (Admin only)
 */
const createUser = async (req, res, next) => {
    try {
        const { name, username, password, email, role, department } = req.body;

        if (!name || !username || !password || !email) {
            return res.status(400).json({
                success: false,
                message: "Name, username, password, and email are required.",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await User.create({
            name,
            username,
            password: hashedPassword,
            email,
            role: role || "user",
            department,
        });

        res.status(201).json({
            success: true,
            message: "User created successfully.",
            data: user,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * PUT /api/v1/users/:id
 * Update user details — name, email, role, department, active status.
 * Password modification is NOT permitted through this endpoint.
 */
const updateUser = async (req, res, next) => {
    try {
        const { name, email, role, department, active, password } = req.body;
        const { id } = req.params;

        const queryConditions = [{ username: id }];
        if (mongoose.isValidObjectId(id)) {
            queryConditions.push({ _id: id });
        }

        const user = await User.findOne({ $or: queryConditions });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        if (name !== undefined) user.name = name;
        if (email !== undefined) user.email = email;
        if (role !== undefined) user.role = role;
        if (department !== undefined) user.department = department;
        if (active !== undefined) user.active = active;
        if (password && password.trim() !== "") {
            user.password = await bcrypt.hash(password, 12);
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: "User updated successfully.",
            data: user,
        });
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/v1/users/:id
 * Delete a user account (Admin only)
 * Self-deletion is blocked.
 */
const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (req.user && (req.user._id.toString() === id || req.user.username === id)) {
            return res.status(400).json({
                success: false,
                message: "You cannot delete your own account.",
            });
        }

        const queryConditions = [{ username: id }];
        if (mongoose.isValidObjectId(id)) {
            queryConditions.push({ _id: id });
        }

        const user = await User.findOneAndDelete({ $or: queryConditions });
        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "User not found." });
        }

        res.status(200).json({ success: true, message: "User deleted successfully." });
    } catch (err) {
        next(err);
    }
};

module.exports = { getUsers, createUser, updateUser, deleteUser };