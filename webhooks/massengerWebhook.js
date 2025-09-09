
exports.getWebhook = (req, res) => {
  const VERIFY_TOKEN = 'Ahmad';
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
};

// exports.postWebhook = (req, res) => {
//   const body = req.body;
//   console.log(body.entry[0].messaging[0])

//   if(body.entry[0].changes[0].value.verb==="add"){
//   console.log("Webhook POST Data:", body.entry[0]);
//   console.log("data : ",body.entry[0].changes[0]);
//   }
//   if (body.object === 'page') {
//     body.entry.forEach(entry => {
//       const event = entry.messaging[0];
//       const senderId = event.sender.id;
//       const messageText = event.message?.text;

//       console.log(`New message from ${senderId}: ${messageText}`);
//     });
//     res.status(200).send('EVENT_RECEIVED');
//   } else {
//     res.sendStatus(404);
//   }
// };

const axios = require('axios');
const Ticket = require('../models/Ticket');
const FacebookPage = require("../models/facebookModel");

async function getUserProfile(psid, accessToken) {
  try {
    const response = await axios.get(`https://graph.facebook.com/${psid}`, {
      params: {
        fields: 'first_name,last_name',
        access_token: accessToken
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching user profile:', error.response?.data || error.message);
    return null;
  }
}

async function getPageAccessToken(pageId) {
  try {
    const pageRecord = await FacebookPage.findOne({ fbPageId: pageId });
    if (!pageRecord) {
      throw new Error(`Page with ID ${pageId} not found in DB`);
    }
    return pageRecord.pageAccessToken;
  } catch (error) {
    console.error('Error fetching page access token:', error.message);
    throw error;
  }
}

exports.postWebhook = async (req, res) => {
  try {
    const body = req.body;

    if (body.object !== 'page') {
      return res.sendStatus(404);
    }

    for (const entry of body.entry) {
      // ✅ Handle Messenger messages
      if (entry.messaging) {
        console.log(entry.messaging)
        for (const event of entry.messaging) {
          const senderId = event.sender?.id;
          const recipientId = event.recipient?.id;
          const message = event.message;

          if (!senderId || senderId === recipientId) {
            console.log("⚠️ Message from page owner or invalid sender - skipping.");
            continue;
          }

          const messageText = message?.text || '';
          const messageId = message?.mid || null;
          
          if (!messageId) continue;

          // Check duplicate
          const exists = await Ticket.findOne({ messageId });
          if (exists) {
            console.log(`⚠️ Duplicate message (messageId: ${messageId}) - skipping.`);
            continue;
          }

          // Get dynamic token
          let pageAccessToken;
          try {
            pageAccessToken = await getPageAccessToken(recipientId);
          } catch (err) {
            console.error("❌ Could not get page access token.");
            continue;
          }

          // Get user profile
          const userProfile = await getUserProfile(senderId, pageAccessToken);
          const userName = userProfile
            ? `${userProfile.first_name} ${userProfile.last_name}`
            : senderId;

          // Create ticket
          const newTicket = new Ticket({
            subject: `Messenger message from ${userName}`,
            from: userName,
            to: [senderId],
            date: new Date(),
            body: messageText,
            messageId: messageId,
            channel: "messenger",
            source: "customer",
            open: "new",
            lastMessage: new Date()
          });

          await newTicket.save();
          console.log("✅ Messenger ticket created:", newTicket._id);
        }
      }

      // ✅ Handle Comments on Posts
      if (entry.changes) {
        for (const change of entry.changes) {
          const value = change.value;

          if (change.field === 'feed' && value.item === 'comment') {
            const commentId = value.comment_id;
            const messageText = value.message || '';
            const userId = value.from?.id;
            const userName = value.from?.name || 'Unknown';
            const postId = value.post_id;

            if (!commentId || !userId || !messageText) {
              console.log("⚠️ Incomplete comment data - skipping.");
              continue;
            }

            // Check duplicate
            const exists = await Ticket.findOne({ messageId: commentId });
            if (exists) {
              console.log(`⚠️ Duplicate comment (commentId: ${commentId}) - skipping.`);
              continue;
            }

            const newTicket = new Ticket({
              subject: `FB Comment from ${userName}`,
              from: userName,
              to: [userId],
              date: new Date(),
              body: messageText,
              messageId: commentId,
              channel: "messengerComment",
              source: "customer",
              open: "new",
              lastMessage: new Date()
            });

            await newTicket.save();
            console.log("✅ Comment ticket created:", newTicket._id);
          }
        }
      }
    }

    res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error("❌ Webhook error:", error);
    res.sendStatus(500);
  }
};
