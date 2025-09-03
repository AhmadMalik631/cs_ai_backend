const multer = require("multer");

// Use memory storage (because I'll send files directly via nodemailer)
const storage = multer.memoryStorage();

const upload = multer({ storage });

module.exports = upload;