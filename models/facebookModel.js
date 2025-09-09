const mongoose = require('mongoose');

const facebookPageSchema = new mongoose.Schema({
  fbUserId: { type: String, required: true },
  fbPageId: { type: String, required: true, unique: true },
  pageName: { type: String },
  userAccessToken: { type: String },
  longLivedUserAccessToken: { type: String },
  pageAccessToken: { type: String },
  instagramBusinessAccountId: { type: String }, 
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  subscriptionStatus: {
    type: String,
    enum: ['subscribed', 'not_subscribed'],
    default: 'not_subscribed'
  }
}, { timestamps: true });

module.exports = mongoose.model('FacebookPage', facebookPageSchema);
