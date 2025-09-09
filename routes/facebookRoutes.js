const express = require('express');
const router = express.Router();
const controller = require('../controllers/facebookController');
const webhook=require("../webhooks//massengerWebhook");
// OAuth Routes
router.get("/facebook/login/:userId",controller.redirectToFacebook)
router.get('/facebook/validate/:userId', controller.Facebook_Validate_login);
router.get('/facebook/callback', controller.handleFacebookCallback);

// Page Data
router.post('/facebook/pages', controller.fetchPages);

// Webhooks
router.get('/facebook/webhook', webhook.getWebhook);
router.post('/facebook/webhook', webhook.postWebhook);
router.post('/facebook/subscribe', controller.subscribeWebhook);
router.post("/facebook/reply/:userId",controller.replyMessenger);
router.post("/facebook/comment/reply/:userId",controller.replyFacebookComment);

module.exports = router;
