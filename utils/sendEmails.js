const nodemailer = require("nodemailer");
const { marked } = require('marked');
function markdownToHtml(markdownText) {
  let html = marked.parse(markdownText);
  html = html.replace(/(?<!\n)\n(?!\n)/g, '<br>');
  return html;
}
const sendEmail = async ({ to, subject,text, html, attachments = [], inReplyTo, references }) => {
  let processedhtml = markdownToHtml(html);
  const htmls = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <style>
      body { font-family: Arial, sans-serif; font-size: 14px; color: #333; }
      code { background-color: #f4f4f4; padding: 2px 4px; border-radius: 4px; font-family: monospace; }
    </style>
  </head>
  <body>
  ${processedhtml}
  </body>
</html>
`;
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const mailOptions = {
    from: `"Wajid Ali" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    text,
    html:htmls,
    attachments,
    headers: {},
  };
  console.log("Send Mail References Before", references);

  if (inReplyTo) {
    mailOptions.inReplyTo = inReplyTo;

    // Handle references properly - maintain array structure for email headers
    if (Array.isArray(references)) {
      // For email headers, we need to join with spaces, but keep original array for database
      mailOptions.references = references.join(" ");
    } else {
      mailOptions.references = references || inReplyTo;
    }
  }

  console.log("Send Mail References After", mailOptions.references);

  return transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
