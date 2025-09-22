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
router.post("/facebook/hideComment",controller.Hide_Comments)
router.get("/facebook/checkCommentStatus",controller.Check_Comment_Status);
router.post("/facebook/deleteComment",controller.Delete_Comment);

module.exports = router;
