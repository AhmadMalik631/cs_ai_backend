const express = require("express");
const router = express.Router();
const whatsappController = require("../controllers/whatsappController");
router.get("/whatsapp/callback", whatsappController.getWhatsappwebhook);
router.post("/whatsapp/callback", whatsappController.postWhatsappwebhook);

module.exports = router;
