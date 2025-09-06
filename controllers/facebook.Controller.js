const FacebookPage = require('../models/facebook.model');
const {
  exchangeAccessToken,
  exchangeForLongLivedToken,
  getUserPages,
  subscribePage,
  messengerService
} = require('../services/facebook.service');
const config = require('../config/config');
const SCOPES = require("../constants/facebook.constants");
const mongoose = require('mongoose');
const axios =require("axios");
exports.redirectToFacebook=(req, res) =>{
  const {userId}=req.params;
  const authUrl = new URL("https://www.facebook.com/v20.0/dialog/oauth");
  authUrl.searchParams.set("client_id", config.FACEBOOK_APP_ID);
  authUrl.searchParams.set("redirect_uri", config.FACEBOOK_REDIRECT_URI);
  authUrl.searchParams.set("scope", SCOPES.SCOPES);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", userId);
  res.redirect(authUrl.toString());
}

// exports.handleFacebookCallback = async (req, res) => {
//   try {
//     const shortToken = await exchangeAccessToken(req.query.code);
//     const longToken = await exchangeForLongLivedToken(shortToken);
//     const pages = await getUserPages(longToken);
//     const userId=req.query.state
//     let _id=new mongoose.Types.ObjectId(req.query.state)
//     console.log(userId)
//     console.log(typeof(_id));
//     for (const page of pages.data) {
//       const { id: pageId, name, access_token: pageAccessToken } = page;
//       await FacebookPage.findOneAndUpdate(
//         { fbPageId: pageId },
//         {
//           fbUserId: page.id,
//           fbPageId: pageId,
//           pageName: name,
//           userAccessToken: shortToken,
//           longLivedUserAccessToken: longToken,
//           pageAccessToken,
//           userId:_id,
//         },
//         { upsert: true, new: true }
//       );

//       await subscribePage(pageId, pageAccessToken);
//     }

//     res.json({ message: 'Token saved & pages subscribed', pages: pages.data });

//   } catch (err) {
//     console.error('Callback Error:', err.response?.data || err.message || err);
//     res.status(500).json({ error: 'Failed to get access token.' });
//   }
// };

// const { checkAndSubscribePage } = require('../utils/facebook.helpers'); 
exports.handleFacebookCallback = async (req, res) => {
  // try {
    const shortToken = await exchangeAccessToken(req.query.code);
    const longToken = await exchangeForLongLivedToken(shortToken);
    const pages = await getUserPages(longToken);
    const userId = req.query.state;
    const _id = new mongoose.Types.ObjectId(userId);

    for (const page of pages.data) {
      const { id: pageId, name, access_token: pageAccessToken } = page;

      // Save or update page
      const updatedPage = await FacebookPage.findOneAndUpdate(
        { fbPageId: pageId, userId: _id },
        {
          fbUserId: page.id,
          fbPageId: pageId,
          pageName: name,
          userAccessToken: shortToken,
          longLivedUserAccessToken: longToken,
          pageAccessToken,
          userId: _id,
        },
        { upsert: true, new: true }
      );

      // Subscribe and update subscription status
      try {
        await subscribePage(pageId, pageAccessToken);

        await FacebookPage.updateOne(
          { fbPageId: pageId, userId: _id },
          { subscriptionStatus: 'subscribed' }
        );
      } catch (subscriptionError) {
        console.error(`Failed to subscribe page ${pageId}:`, subscriptionError.message);
        await FacebookPage.updateOne(
          { fbPageId: pageId, userId: _id },
          { subscriptionStatus: 'not_subscribed' }
        );
      }
    }

    res.json({ message: 'Pages saved & subscription handled.', pages: pages.data });

  // } catch (err) {
  //   console.error('Callback Error:', err.response?.data || err.message || err);
  //   res.status(500).json({ error: 'Failed to get access token.' });
  // }
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
    console.log("page id is :", pageId);
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


// POST /api/messenger/reply/:userId


exports.replyMessenger = async (req, res) => {
  try {
    const { userId } = req.params;
    const { to, message, inReplyTo } = req.body;
    const _id = new mongoose.Types.ObjectId(userId);
      if (!to || !message || !inReplyTo) {
        throw new Error("Missing required fields: to, message, inReplyTo");
      }
      const fbPage = await FacebookPage.findOne({ userId });
      if (!fbPage || !fbPage.pageAccessToken) {
        throw new Error("Page access token not found for user.");
      }
      const pageAccessToken = fbPage.pageAccessToken;
      const payload = {
        recipient: { id: to },
        message: { text: message },
        messaging_type: "RESPONSE"
      };
      const fbResponse = await axios.post(`https://graph.facebook.com/v23.0/me/messages?access_token=${pageAccessToken}`, payload);
     
      const updatedTicket = await Ticket.findOneAndUpdate(
        { messageId: inReplyTo },
        { $set: { inReplyTo } },
        { new: true }
      );
    
      // return {
      //   fbResponse: fbResponse.data,
      //   updatedTicket,
      // };
    res.status(200).json({
      message: "Reply sent successfully.",
      fbResponse: fbResponse.data,
      updatedTicket:updatedTicket,
    });
  } catch (error) {
    console.error("Messenger reply error:", error.message);
    res.status(500).json({ error: error.message });
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




// Check if the token is validate 

exports.Facebook_Validate_login = async (req, res) => {
  // try {
    const { userId } = req.params;
    console.log("data",userId)
    const _id = new mongoose.Types.ObjectId(userId);
    const integration = await FacebookPage.findOne({ userId: _id });

    if (!integration) {
      return res.json({ data: null });
    }
    return res.status(200).json({ data: integration });

  // } catch (err) {
  //   console.error("Facebook_Validate_login error:", err);
  //   return res.status(500).json({ error: "Something went wrong" });
  // }
};
