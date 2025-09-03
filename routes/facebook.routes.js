const express = require('express');
const router = express.Router();
const controller = require('../controllers/facebook.Controller');

// OAuth Routes
router.get('/facebook/login', controller.redirectToFacebook);
router.get('/facebook/callback', controller.handleFacebookCallback);

// Page Data
router.get('/facebook/pages', controller.fetchPages);

// Webhooks
router.get('/facebook/webhook', controller.getWebhook);
router.post('/facebook/webhook', controller.postWebhook);
router.post('/facebook/subscribe', controller.subscribeWebhook);

module.exports = router;
