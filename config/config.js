// config.js
require('dotenv').config();

module.exports = {
  FACEBOOK_APP_ID : process.env.FACEBOOK_APP_ID,
  FACEBOOK_APP_SECRET : process.env.FACEBOOK_APP_SECRET,
  FACEBOOK_REDIRECT_URI : process.env.FACEBOOK_REDIRECT_URI,
};
