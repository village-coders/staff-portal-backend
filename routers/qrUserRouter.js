const express = require("express");
const {
    getQRUsers,
    createQRUser,
    updateQRUser,
    deleteQRUser,
} = require("../controllers/qrUserController");
const { protectQR, authorizeQR } = require("../middlewares/qrAuthMiddlewares");

const router = express.Router();

// All QR user routes require QR authentication and Admin role
router.use(protectQR, authorizeQR("admin"));

router.get("/", getQRUsers);
router.post("/", createQRUser);
router.put("/:id", updateQRUser);
router.delete("/:id", deleteQRUser);

module.exports = router;
