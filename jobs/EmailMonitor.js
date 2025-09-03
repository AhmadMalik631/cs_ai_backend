const { ImapFlow } = require("imapflow");
const axios = require("axios");
const getEmails = require("../utils/EmailFetcher");
const Ticket = require("../models/Ticket");
const DuplicateDetectionService = require("../utils/duplicateDetection");
const cron = require('node-cron');

let isRunning = false;
let imapClient = null;

// Function to establish connection
const connectToImap = async () => {
  try {
    const client = new ImapFlow({
      host: "imap.gmail.com",
      port: 993,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
      logger: false,
    });

    client.on("error", (err) => {
      console.error("❌ IMAP error:", err.message);
    });

    await client.connect();
    console.log("📡 Connected to IMAP");

    imapClient = client;
  } catch (err) {
    console.error("❌ Failed to connect to IMAP:", err.message);
    imapClient = null;
  }
};


cron.schedule('* * * * * *', async () => {

  if (isRunning) return;

  isRunning = true;

  try {
    // If client isn't connected, reconnect
    if (!imapClient || !imapClient.usable) {
      console.log("🔄 IMAP client not ready. Reconnecting...");
      await connectToImap();
    }

    // Still failed to connect
    if (!imapClient || !imapClient.usable) {
      console.warn("⚠️ Skipping this cycle — IMAP connection still down");
      return;
    }

    // Fetch emails using the persistent connection
    const { inbox, sent } = await getEmails(imapClient);

    // console.log("inbox", inbox);
    // console.log("sent", sent);

    if (inbox.length > 0) {
      console.log('Inbox emails:');
      // Save and dispatch INBOX emails only
      let count = 0;
      for (const email of inbox) {
        console.log('Email:', email);

        const fromAddress = ((email.from.match(/<(.*)>/) || [])[1] || email.from).toLowerCase();
        const isCustomer = fromAddress !== process.env.GMAIL_USER.toLowerCase();

        console.log("isCustomer", isCustomer);
        console.log("fromAddress", fromAddress);
        
        // Check for duplicates first
        const exists = await Ticket.findOne({ messageId: email.messageId });
        
        // Set source based on sender
        email.source = isCustomer ? 'customer' : 'agent';

        // --- SLA LOGIC: Only apply to customer emails ---
        if (isCustomer) {
          const isNewThread = !email.inReplyTo && (!email.references || email.references.length === 0);

          if (isNewThread) {
            // Case 1: New ticket from a customer -> Set initial SLA
            console.log(`Setting initial SLA for new customer thread: ${email.subject}`);
            const emailDate = new Date();
            
            email.slaDeadline = new Date(emailDate.getTime() + 24 * 60 * 60 * 1000);
            email.slaBreached = false;
            email.firstResponseAt = null;
            email.lastCustomerMessageAt = emailDate;
          } else {
            // Case 2: Customer reply in an existing thread -> Find and update root ticket
            let rootTicket = null;
            
            // Try to find root ticket by inReplyTo
            if (email.inReplyTo) {
              rootTicket = await Ticket.findOne({ messageId: email.inReplyTo });
            }
            
            // If not found, try to find by references
            if (!rootTicket && email.references && email.references.length > 0) {
              rootTicket = await Ticket.findOne({ messageId: { $in: email.references } });
            }

            if (rootTicket) {
              console.log(`Customer reply detected. Resetting SLA for root ticket ${rootTicket._id}`);
              
              // Update the root ticket with new SLA deadline
              const newDate = new Date();
              await Ticket.findByIdAndUpdate(rootTicket._id, {
                lastCustomerMessageAt: newDate,
                slaDeadline: new Date(newDate.getTime() + 24 * 60 * 60 * 1000),
                slaBreached: false,
                firstResponseAt: null // Reset first response to make SLA active again
              });
              
              // Set SLA fields for this reply email (for consistency)
              email.slaDeadline = new Date(newDate.getTime() + 24 * 60 * 60 * 1000);
              email.slaBreached = false;
              email.firstResponseAt = null;
              email.lastCustomerMessageAt = newDate;
            } else {
              console.log(`Could not find root ticket for customer reply. Subject: ${email.subject}`);
              // Set default SLA fields for this email
              const emailDate = new Date();
              email.slaDeadline = new Date(emailDate.getTime() + 24 * 60 * 60 * 1000);
              email.slaBreached = false;
              email.firstResponseAt = null;
              email.lastCustomerMessageAt = emailDate;
            }
          }
        } else {
          // Agent emails - no SLA fields
          console.log(`Email from agent/system detected, skipping SLA logic. Subject: ${email.subject}`);
          email.slaDeadline = null;
          email.slaBreached = null;
          email.firstResponseAt = null;
          email.lastCustomerMessageAt = null;
        }


                const saved = await Ticket.create(email);
                
                // Check for duplicates after ticket creation
                try {
                  const duplicateInfo = await DuplicateDetectionService.detectDuplicates(saved);
                  await DuplicateDetectionService.updateTicketDuplicateStatus(saved._id, duplicateInfo);
                  console.log(`🔍 Duplicate check completed for ticket: ${saved.subject}`);
                } catch (duplicateError) {
                  console.error("❌ Duplicate detection failed:", duplicateError.message);
                }
      
        // Send customer email data to Python service for AI processing
        if (isCustomer) {
          // Wrap the saved object to indicate it's a customer email for downstream processing/logging
          const customerEmailPayload = {
            type: 'customer_email',
            data: saved
          };
          console.log("Customer Data", customerEmailPayload);
          try {
            const response = await axios.post(process.env.PYTHON_SERVICE_URL, customerEmailPayload);
            console.log("Python Service Response", response);
            console.log(`📨 Customer email sent to Python service: ${saved.subject}`);
          } catch (pythonServiceErr) {
            console.error("❌ Python service error:", pythonServiceErr.message);
          }
        } else {
          console.log(`⏭️ Skipping Python service for agent email: ${saved.subject}`);
        }
      }
    }

    else{
      // console.log('No new emails in inbox');
    }

    if(sent.length > 0) {
      console.log('Sent emails:');
      // Save and dispatch SENT emails only
      let count = 0;
      for (const email of sent) {
        console.log('Sent Email:', email);

        // For sent emails, we know they are from the company to customer
        // So we set source as 'agent' and add SLA fields as null/empty
        email.source = 'agent';
        email.slaDeadline = null;
        email.slaBreached = null;
        email.firstResponseAt = null;
        email.lastCustomerMessageAt = null;

        // Check for duplicates first
        const exists = await Ticket.findOne({ messageId: email.messageId });
        if (exists) {
          console.log('Duplicate sent email found:', email.messageId);
          continue;
        }

        const saved = await Ticket.create(email);
        
        // Check for duplicates after ticket creation
        try {
          const duplicateInfo = await DuplicateDetectionService.detectDuplicates(saved);
          await DuplicateDetectionService.updateTicketDuplicateStatus(saved._id, duplicateInfo);
          console.log(`🔍 Duplicate check completed for sent ticket: ${saved.subject}`);
        } catch (duplicateError) {
          console.error("❌ Duplicate detection failed for sent email:", duplicateError.message);
        }
        
        count++;

        // No webhook needed for sent emails (agent emails)
        console.log(`📤 Agent email saved (no webhook needed): ${saved.subject}`);
      }
      
      console.log('Total sent emails processed:', count);
    } else {
      // console.log('No new sent emails');
    }
    

    const total = inbox.length + sent.length;
    if (total > 0) {
      console.log(`✅ Processed ${total} new emails.`);
    } else {
      // console.log("📭 No new emails.");
    }
  } catch (err) {
    console.error("❌ Unexpected error:", err.message);
  } finally {
    isRunning = false;
  }
}
);
