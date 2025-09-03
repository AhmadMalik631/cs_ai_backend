// models/EmailState.js
const mongoose = require("mongoose");

const emailStateSchema = new mongoose.Schema({
  folder: { type: String, enum: ["INBOX", "SENT"], unique: true },
  lastUid: Number,
});

module.exports = mongoose.model("EmailState", emailStateSchema);
