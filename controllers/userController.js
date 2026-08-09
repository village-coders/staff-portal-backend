const bcrypt = require("bcryptjs");
const User = require("../models/users");

/**
 * GET /api/v1/users
 * List all users — paginated with optional search (Admin / Super Admin only)
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
 * Create a new user (Admin / Super Admin only)
 * Admin cannot create another super_admin — only super_admin can.
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

        // Guard: only super_admin can create another super_admin
        if (role === "super_admin" && req.user.role !== "super_admin") {
            return res.status(403).json({
                success: false,
                message: "Only a super admin can create another super admin account.",
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
        // Hard block on password changes
        if (req.body.password !== undefined) {
            return res.status(400).json({
                success: false,
                message: "Password cannot be changed through this endpoint.",
            });
        }

        const { name, email, role, department, active } = req.body;

        // Guard: only super_admin can assign super_admin role
        if (role === "super_admin" && req.user.role !== "super_admin") {
            return res.status(403).json({
                success: false,
                message: "Only a super admin can assign the super admin role.",
            });
        }

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (email !== undefined) updates.email = email;
        if (role !== undefined) updates.role = role;
        if (department !== undefined) updates.department = department;
        if (active !== undefined) updates.active = active;

        if (Object.keys(updates).length === 0) {
            return res
                .status(400)
                .json({ success: false, message: "No valid fields to update." });
        }

        const user = await User.findByIdAndUpdate(req.params.id, updates, {
            new: true,
            runValidators: true,
        });

        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "User not found." });
        }

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
 * Delete a user account (Admin / Super Admin only)
 * Self-deletion is blocked.
 */
const deleteUser = async (req, res, next) => {
    try {
        if (req.params.id === req.user._id.toString()) {
            return res.status(400).json({
                success: false,
                message: "You cannot delete your own account.",
            });
        }

        const user = await User.findByIdAndDelete(req.params.id);
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