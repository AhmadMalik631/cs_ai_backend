const axios = require('axios');
const config = require('../config/config');
const FacebookPage = require("../models/facebook.model");
const Ticket = require("../models/Ticket");
exports.exchangeAccessToken = async (code) => {
  const response = await axios.get('https://graph.facebook.com/v23.0/oauth/access_token', {
    params: {
      client_id: config.FACEBOOK_APP_ID,
      redirect_uri: config.FACEBOOK_REDIRECT_URI,
      client_secret: config.FACEBOOK_APP_SECRET,
      code
    }
  });
  return response.data.access_token;
};


//  exchange the token
exports.exchangeForLongLivedToken = async (shortLivedToken) => {
  const response = await axios.get('https://graph.facebook.com/v23.0/oauth/access_token', {
    params: {
      grant_type: 'fb_exchange_token',
      client_id: config.FACEBOOK_APP_ID,
      client_secret: config.FACEBOOK_APP_SECRET,
      fb_exchange_token: shortLivedToken
    }
  });
  return response.data.access_token;
};


// get the user account detail
exports.getUserPages = async (accessToken) => {
  const response = await axios.get('https://graph.facebook.com/v23.0/me/accounts', {
    params: { access_token: accessToken }
  });
  return response.data;
};


// for the subscription
exports.subscribePage = async (pageId, pageAccessToken) => {
  const response = await axios.post(`https://graph.facebook.com/v23.0/${pageId}/subscribed_apps`, {
  "subscribed_fields": ["messages","feed"]
  }, {
    params: { access_token: pageAccessToken }
  });
  return response.data;
};


// reply 


exports.sendMessengerReply = async ({ userId, to, message, inReplyTo }) => {
  if (!to || !message || !inReplyTo) {
    throw new Error("Missing required fields: to, message, inReplyTo");
  }
  console.log(">.............................");
  const fbPage = await FacebookPage.findOne({ userId });
  if (!fbPage || !fbPage.pageAccessToken) {
    throw new Error("Page access token not found for user.");
  }

  const pageAccessToken = fbPage.pageAccessToken;
  const graphUrl = `https://graph.facebook.com/v18.0/me/messages?access_token=${pageAccessToken}`;
  const payload = {
    recipient: { id: to },
    message: { text: message },
  };

  const fbResponse = await axios.post(graphUrl, payload);

  const updatedTicket = await Ticket.findOneAndUpdate(
    { messageId: inReplyTo },
    { $set: { inReplyTo } },
    { new: true }
  );

  return {
    fbResponse: fbResponse.data,
    updatedTicket,
  };
};


