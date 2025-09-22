const {
  getAccessToken,
  getPageAndBusiness,
  saveAdminInstagram,
  getMessages,
  replyToMessage
} =require("../services/instagramService.js");

export const authInstagram = (req, res) => {
  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${process.env.APP_ID}&redirect_uri=${process.env.REDIRECT_URI}&scope=instagram_basic,instagram_manage_messages,pages_show_list,pages_manage_metadata`;
  res.redirect(authUrl);
};

// 2️⃣ OAuth Callback
export const authCallback = async (req, res) => {
  try {
    const { code } = req.query;
    const accessToken = await getAccessToken(code);
    const { pageId, businessId } = await getPageAndBusiness(accessToken);

    await saveAdminInstagram({ pageId, businessId, accessToken });
    res.send("✅ Instagram Business connected successfully!");
  } catch (err) {
    console.error(err.message);
    res.status(500).send("OAuth failed");
  }
};

// 3️⃣ Get Messages
export const fetchMessages = async (req, res) => {
  try {
    const data = await getMessages();
    res.json(data);
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// 4️⃣ Reply
export const replyMessage = async (req, res) => {
  try {
    const { messageId, text } = req.body;
    const data = await replyToMessage(messageId, text);
    res.json({ success: true, response: data });
  } catch (err) {
    res.status(500).send(err.message);
  }
};
