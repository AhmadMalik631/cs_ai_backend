const axios = require('axios');
const config = require('../config/config');

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

exports.getUserPages = async (accessToken) => {
  const response = await axios.get('https://graph.facebook.com/v23.0/me/accounts', {
    params: { access_token: accessToken }
  });
  return response.data;
};

exports.subscribePage = async (pageId, pageAccessToken) => {
  const response = await axios.post(`https://graph.facebook.com/v23.0/${pageId}/subscribed_apps`, {
  "subscribed_fields": ["messages"]

  }, {
    params: { access_token: pageAccessToken }
  });
  return response.data;
};
