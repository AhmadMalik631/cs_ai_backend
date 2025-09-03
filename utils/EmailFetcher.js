const { simpleParser } = require("mailparser");
const EmailState = require("../models/EmailState");
const fs = require("fs");
const path = require("path");

const getEmails = async (client) => {
  const fetchFromFolder = async (folderPath, folderLabel) => {
    const emails = [];

    let state = await EmailState.findOne({ folder: folderLabel });
    if (!state) {
      state = await EmailState.create({ folder: folderLabel, lastUid: 0 });
    }

    const lastUID = state.lastUid;

    try {
      await client.mailboxOpen(folderPath);
      let messageList = [];

      if (!lastUID || lastUID === 0) {
        let status = await client.status(folderPath, { messages: true });
        let total = status.messages;
        let startUID = total > 50 ? total - 49 : 1;

        for await (let msg of client.fetch(`${startUID}:*`, { uid: true, source: true })) {
          messageList.push(msg);
        }
      } else {
        for await (let msg of client.fetch(`${lastUID + 1}:*`, { uid: true, source: true })) {
          if (msg.uid > lastUID) {
            messageList.push(msg);
          }
        }
      }

      let maxUID = lastUID;

      for (const msg of messageList) {
        const parsed = await simpleParser(msg.source);
        const rawRefs = parsed.headers.get("references");
        let refsArray = [];
        if (rawRefs) {
          const headerString = Array.isArray(rawRefs) ? rawRefs.join(" ") : rawRefs;

          refsArray = headerString
            .replace(/[\[\]"']/g, "") // Remove brackets and quotes
            .split(/\s+/) // Split on whitespace
            .map((id) => {
              // Remove extra leading/trailing <> if present
              return id.replace(/^<+/, "<").replace(/>+$/, ">");
            })
            .filter((id) => /^<.+@.+>$/.test(id)); // Only keep valid-looking message IDs
        }


        const attachments = [];

        if (parsed?.attachments?.length > 0) {
          for (const attachment of parsed.attachments) {
            const timestamp = Date.now();

            // Provide fallback filename if missing
            const originalFilename = attachment.filename || `unnamed-${timestamp}`;
            const safeFilename = `${timestamp}-${originalFilename.replace(/[^a-zA-Z0-9.]/g, "_")}`;
            const uploadPath = path.join(__dirname, "../uploads", safeFilename);

            // Save file to local uploads folder
            fs.writeFileSync(uploadPath, attachment.content);

            // Build URL
            attachments.push({
              filename: attachment?.filename,
              url: `${process.env.BASE_URL}/media/${safeFilename}`, // BASE_URL points to our backend URL
            });
          }
        }

        emails.push({
          subject: parsed.subject || "",
          from: parsed.from?.text || "",
          to: Array.isArray(parsed.to?.value) ? parsed.to.value.map((r) => r.address) : [],
          date: parsed.date || new Date(),
          body: parsed.text || "",
          channel: "email",
          messageId: parsed.messageId || "",
          inReplyTo: parsed.inReplyTo || "",
          references: refsArray,
          attachments,
        });

        if (msg.uid > maxUID) maxUID = msg.uid;
      }

      if (maxUID > lastUID) {
        await EmailState.updateOne({ folder: folderLabel }, { lastUid: maxUID });
      }
    } catch (err) {
      console.error(`❌ Error in folder ${folderLabel}:`, err.message);
    }

    return emails;
  };

  const inboxEmails = await fetchFromFolder("INBOX", "INBOX");
  const sentEmails = await fetchFromFolder("[Gmail]/Sent Mail", "SENT");

  return {
    inbox: inboxEmails,
    sent: sentEmails,
  };
};

module.exports = getEmails;
