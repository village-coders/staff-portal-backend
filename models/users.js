const { Schema, model } = require("mongoose");

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: [true, "Username is required"],
            unique: true,
            trim: true,
            index: true,
        },
        password: {
            type: String,
            required: [true, "Password is required"],
            select: false, // Never returned in queries by default
        },
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
        },
        role: {
            type: String,
            enum: [
                "user",
                "financial_officer",
                "ceo",
                "accountant",
                "admin",
                "chairman",
                "super_admin",
            ],
            default: "user",
        },
        department: {
            type: String,
            trim: true,
        },
        active: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

// Exclude password from all JSON serializations
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

const User = model("User", userSchema);
module.exports = User;