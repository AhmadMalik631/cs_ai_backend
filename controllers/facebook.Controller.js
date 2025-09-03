const FacebookPage = require('../models/facebook.model');
const {
  exchangeAccessToken,
  exchangeForLongLivedToken,
  getUserPages,
  subscribePage,
} = require('../services/facebook.service');
const config = require('../config/config');
const SCOPES = require("../constants/facebook.constants");

exports.redirectToFacebook = (req, res) => {
    const authUrl = new URL("https://www.facebook.com/v20.0/dialog/oauth");
  authUrl.searchParams.set("client_id", config.FACEBOOK_APP_ID);
  authUrl.searchParams.set("redirect_uri",config.FACEBOOK_REDIRECT_URI);
  authUrl.searchParams.set("scope", SCOPES.SCOPES);
  authUrl.searchParams.set("response_type", "code");
  res.redirect(authUrl.toString());
};

exports.handleFacebookCallback = async (req, res) => {
  try {
    const shortToken = await exchangeAccessToken(req.query.code);
    const longToken = await exchangeForLongLivedToken(shortToken);

    const pages = await getUserPages(longToken);

    for (const page of pages.data) {
      const { id: pageId, name, access_token: pageAccessToken } = page;

      await FacebookPage.findOneAndUpdate(
        { fbPageId: pageId },
        {
          fbUserId: page.id,
          fbPageId: pageId,
          pageName: name,
          userAccessToken: shortToken,
          longLivedUserAccessToken: longToken,
          pageAccessToken,
        },
        { upsert: true, new: true }
      );

      await subscribePage(pageId, pageAccessToken);
    }

    res.json({ message: 'Token saved & pages subscribed', pages: pages.data });

  } catch (err) {
    console.error('Callback Error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to get access token.' });
  }
};

exports.fetchPages = async (req, res) => {
  try {
    const pages = await FacebookPage.find({});
    res.json(pages);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching pages.', details: err.message });
  }
};

exports.subscribeWebhook = async (req, res) => {
  try {
    const pageId = req.query.pageId;;
    console.log("page id is :",pageId);
    const pageData = await FacebookPage.findOne({ fbPageId: pageId });
    if (!pageData) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const result = await subscribePage(pageId, pageData.pageAccessToken);
    res.json({ message: 'Subscribed successfully', result });

  } catch (err) {
    res.status(500).json({ error: 'Subscription failed', details: err.response?.data });
  }
};





const replyToComment = async (commentId, message, pageAccessToken) => {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v20.0/${commentId}/comments`,
      {
        message: message
      },
      {
        params: {
          access_token: pageAccessToken
        }
      }
    );

    console.log("✅ Replied to comment:", response.data);
  } catch (err) {
    console.error("Failed to reply to comment:", err.response?.data || err.message);
  }
};