const sendEmail = require("../utils/sendEmails");

const getEmailConfig = async (req, res, next) => {
  try {
    const fromEmail = process.env.GMAIL_USER;
    
    res.status(200).json({ 
      fromEmail,
      displayName: "CSAutomation"
    });
  } catch (error) {
    next(error);
  }
};

const sendEmailReply = async (req, res, next) => {
  try {
    const { to, subject, text, html, inReplyTo, references } = req.body;

    if (!to || !subject || !text) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const files = req.files || [];

    const attachments = files.map((file) => ({
      filename: file.originalname,
      content: file.buffer,
    }));

    let fixedReferences;

    try {
      // If it's a JSON stringified array, convert it to array and join with spaces
      fixedReferences = JSON.parse(references);
      if (Array.isArray(fixedReferences)) {
        fixedReferences = fixedReferences.join(" ");
      }
    } catch (e) {
      // fallback: assume it's already a space-separated string
      fixedReferences = references;
    }

    const info = await sendEmail({
      to,
      subject,
      text,
      html,
      inReplyTo,
      references: fixedReferences,
      attachments,
    });

    res.status(200).json({ message: "Email sent", messageId: info.messageId });
  } catch (error) {
    next(error);
  }
};

module.exports = { sendEmailReply, getEmailConfig };
