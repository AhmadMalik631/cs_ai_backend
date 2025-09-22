const axios = require('axios');

async function sendWhatsAppMessage(phoneNumberId, to, message, accessToken) {
  const url = `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`;
  const data = {
    messaging_product: "whatsapp",
    to: to,
    type: "text",
    text: { body: message }
  };
  
  const headers = { Authorization: `Bearer ${accessToken}` };
  
  const response = await axios.post(url, data, { headers });
  return response.data;
}

const token = "EAAfUiEEdsZA8BPaj1pBV0wMpRvd4EeA32ejZAwJP0EPBUMd2SraPc0kAAttZB9RZBfDDUWKBNBgkzH5LRH2RqWrSZCfF03agZBdircZA6IdLCFQNNkCuW36eeaGkNdU0M4UuKqInD0H2hlRrSZC7ZAuKxIwXxZCZCd0rlP3knPqyNZBqGndRohYE6qFDTp6Je0iotmPjxGJaCiIovRSccx4Rt77pf5i0GQ7Pd3Doqqik4anPjTF5C0QHVv3vsTOJQgZDZD"; 
const phoneNumberId = process.env.PHONE_NUMBER_ID;

// app.post("/send-whatsapp", async (req, res) => {
//   const { to, message } = req.body;

//   try {
//     const response = await axios.post(
//       `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
//       {
//         messaging_product: "whatsapp",
//         to,
//         type: "text",
//         text: { body: message },
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     res.json(response.data);
//   } catch (error) {
//     console.error(error.response?.data || error.message);
//     res.status(500).json({ error: "Failed to send message" });
//   }
// });

// Webhook to receive messages
exports.postWhatsappwebhook=async (req, res) => {
  console.log("triggered")
  console.log("Incoming WhatsApp webhook:", req.body.entry[0].changes[0].value);
  res.sendStatus(200);
};

// Verify webhook
exports.getWhatsappwebhook=async (req, res) => {
  const verifyToken = "Ahmad";
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === verifyToken) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
};
