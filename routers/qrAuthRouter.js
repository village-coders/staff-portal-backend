const express = require("express");
const { qrLogin, qrGetMe, qrLogout } = require("../controllers/qrAuthController");
const { protectQR } = require("../middlewares/qrAuthMiddlewares");

const router = express.Router();

router.post("/login", qrLogin);
router.post("/logout", qrLogout);
router.get("/me", protectQR, qrGetMe);

module.exports = router;
