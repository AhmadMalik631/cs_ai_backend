
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

exports.postWebhook = (req, res) => {
  const body = req.body;
  console.log(body.entry[0].messaging[0])

  if(body.entry[0].changes[0].value.verb==="add"){
  console.log("Webhook POST Data:", body.entry[0]);
  console.log("data : ",body.entry[0].changes[0]);
  }
  if (body.object === 'page') {
    body.entry.forEach(entry => {
      const event = entry.messaging[0];
      const senderId = event.sender.id;
      const messageText = event.message?.text;

      console.log(`New message from ${senderId}: ${messageText}`);
    });
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
};