const mongoose = require('mongoose');

const facebookPageSchema = new mongoose.Schema({
  fbUserId: { type: String, required: true },
  fbPageId: { type: String, required: true, unique: true },
  pageName: { type: String },
  userAccessToken: { type: String },
  longLivedUserAccessToken: { type: String },
  pageAccessToken: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('FacebookPage', facebookPageSchema);
