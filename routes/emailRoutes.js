const express = require("express");
const router = express.Router();
const upload = require("../middleware/multer");
const { sendEmailReply, getEmailConfig  } = require("../controllers/emailController");


router.get("/config", getEmailConfig);
router.post("/send-email", upload.array("attachments"), sendEmailReply);
router.post("/create-ticket", upload.array("attachments"), sendEmailReply);

module.exports = router;
