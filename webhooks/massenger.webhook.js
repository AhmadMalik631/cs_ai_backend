
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

const PAGE_ACCESS_TOKEN = "EAAfUiEEdsZA8BPTpdJw7JPyZBWvCD6P27pG1UurKFfpBCDlva3WfnwqAtIzRctWBRUDZAyZCbrBLr1NbxGdnG8jHmZBgeTrXZAIUxk5KherQSyDnRsiIZC7J4ZBiKheBguhvIljrFOzZCZBlRT8nrQqZCZB3QleNpTduDwEU2pqvnNQXldzOwwHqI6BgZA0e6iRpfBVKkyQYiTEvGRiDxcY2V9WhzZAzj3"

async function getUserProfile(psid) {
  try {
    const response = await axios.get(`https://graph.facebook.com/${psid}`, {
      params: {
        fields: 'first_name,last_name',
        access_token: PAGE_ACCESS_TOKEN
      }
    });
    console.log(response);
    return response.data;
  } catch (error) {
    console.error('Error fetching user profile:', error.response?.data || error.message);
    return null;
  }
}

exports.postWebhook = async (req, res) => {
  try {
    const body = req.body;
    console.log(body);
    console.log(req.body.entry[0].messaging);
    if (body.object !== 'page') {
      return res.sendStatus(404);
    }

    for (const entry of body.entry) {
      const messaging = entry.messaging;

      for (const event of messaging) {
        const senderId = event.sender.id;
        console.log(senderId)
        const recipientId = event.recipient.id;
        const message = event.message;
        if (senderId === recipientId) {
          console.log("⚠️ Message from page owner - skipping.");
          continue;
        }

        const messageText = message?.text || '';
        const messageId = message?.mid || null;

        // Check duplicate
        const exists = await Ticket.findOne({ messageId });
        if (exists) {
          console.log(`⚠️ Duplicate message detected (messageId: ${messageId}) - skipping.`);
          continue;
        }

        // Fetch user profile
        const userProfile = await getUserProfile(senderId);
        const userName = userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : senderId;

        // Create ticket with name in subject
        const newTicket = new Ticket({
          subject: `Messenger message from ${userName}`,
          from: userName,
          to: [senderId],
          date: new Date(event.timestamp),
          body: messageText,
          messageId: messageId,
          channel: "messenger",
          source: "customer",
          open: "new",
          lastMessage: new Date()
        });
        await newTicket.save();
        console.log("✅ Ticket created:", newTicket._id);
      }
    }
    res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error("❌ Webhook error:", error);
    res.sendStatus(500);
  }
};
