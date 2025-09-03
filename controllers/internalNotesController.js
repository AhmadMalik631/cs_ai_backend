const InternalNotes = require('../models/InternalNotes');
const Ticket = require('../models/Ticket');
const sendEmail = require('../utils/sendEmails');
const axios = require('axios');

// Get AI suggested reply for a ticket
const getAISuggestion = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    
    // Get all AI suggestions for this ticket (there could be multiple for different customer emails)
    const internalNotes = await InternalNotes.find({ 
      ticketId, 
      status: { $in: ['pending', 'approved', 'feedback_submitted','sent','regenerating'] }
    }).populate('agentId', 'name email').sort({ createdAt: -1 });
    
    if (!internalNotes.length) {
      return res.status(404).json({ message: 'No AI suggestions found for this ticket' });
    }
    
    // Return the most recent AI suggestion
    res.status(200).json(internalNotes[0]);
  } catch (error) {
    next(error);
  }
};

// Receive AI suggestion from Python service
const receiveAISuggestion = async (req, res, next) => {
  try {
    const { ticketId, customerEmail, aiSuggestion, responseTime, messageId } = req.body;
    
    if (!ticketId || !customerEmail || !aiSuggestion || !messageId) {
      return res.status(400).json({ message: 'Missing required fields: ticketId, customerEmail, aiSuggestion, messageId' });
    }
    
    // Check if ticket exists
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Create or update internal note for this specific message
    const internalNote = await InternalNotes.findOneAndUpdate(
      { ticketId, messageId }, // Use both ticketId and messageId
      {
        customerEmail,
        aiSuggestion,
        aiResponseTime: responseTime || null,
        status: 'pending',
        rating: null,
        feedback: null,
        agentId: null
      },
      { upsert: true, new: true }
    );
    
    res.status(201).json({ 
      message: 'AI suggestion received and stored',
      internalNoteId: internalNote._id 
    });
  } catch (error) {
    next(error);
  }
};

// Rate AI suggestion
const rateAISuggestion = async (req, res, next) => {
  try {
    const { internalNoteId } = req.params;
    const { rating, feedback } = req.body;
    const agentId = req.user.id; // From auth middleware
    
    if (!rating || rating < 1 || rating > 10) {
      return res.status(400).json({ message: 'Rating must be between 1 and 10' });
    }

    // For ratings below 8, feedback is required
    if (rating < 8 && (!feedback || feedback.trim() === '')) {
      return res.status(400).json({ message: 'Feedback is required for ratings below 8' });
    }
    
    const internalNote = await InternalNotes.findById(internalNoteId);
    if (!internalNote) {
      return res.status(404).json({ message: 'Internal note not found' });
    }
    
    // Update rating and feedback
    internalNote.rating = rating;
    internalNote.feedback = feedback;
    internalNote.agentId = agentId;
    
    // Add to feedback history for future AI regeneration
    internalNote.feedbackHistory.push({
      rating,
      feedback,
      timestamp: new Date()
    });
    
    // Update status based on rating
    if (rating >= 8) {
      internalNote.status = 'approved';
    } else {
      internalNote.status = 'feedback_submitted';
    }
    
    await internalNote.save();
    
    res.status(200).json({ 
      message: 'Rating submitted successfully',
      status: internalNote.status,
      canSend: rating >= 8
    });
  } catch (error) {
    next(error);
  }
};

// Request AI regeneration for low-rated suggestions
const requestAIRegeneration = async (req, res, next) => {
  try {
    const { internalNoteId } = req.params;
    const agentId = req.user.id;

    // Find the internal note
    const internalNote = await InternalNotes.findById(internalNoteId);
    if (!internalNote) {
      return res.status(404).json({ message: "Internal note not found" });
    }

    // Verify the agent owns this note or has permission
    if (internalNote.agentId && internalNote.agentId.toString() !== agentId) {
      return res.status(403).json({ message: "Not authorized to request regeneration" });
    }

    // Find the ticket to get context
    const ticket = await Ticket.findById(internalNote.ticketId);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Find the specific customer email we're replying to
    const customerEmail = await Ticket.findOne({ messageId: internalNote.messageId });
    if (!customerEmail) {
      return res.status(404).json({ message: "Customer email not found" });
    }

    // Prepare data for Python service
    const regenerationData = {
      ticketId: internalNote.ticketId,
      messageId: internalNote.messageId,
      customerEmail: internalNote.customerEmail,
      body: {
        subject: customerEmail.subject,
        body: customerEmail.body,
      
      },
      agentFeedback: internalNote.feedback,
      originalAISuggestion: internalNote.aiSuggestion
    };

          // Update internal note status to 'regenerating' to hide it from queries
      await InternalNotes.findByIdAndUpdate(internalNoteId, {
        status: 'regenerating',
        regenerationCount: (internalNote.regenerationCount || 0) + 1,
        lastRegenerationAt: new Date()
      });

      // Send to Python service for regeneration
      try {
        const pythonServiceUrl = process.env.PYTHON_SERVICE_URL;

        //For Production (After AI Regeneration Python Service is implemented)

        console.log("AI Regeneration Response Before", regenerationData);


        const regenerationDataAI = {
          type: 'regenerate_reply',
          data: regenerationData
        };
        

        if (!pythonServiceUrl) {
          return res.status(500).json({ message: "Python service URL not configured" });
        }

        const response = await axios.post(process.env.PYTHON_SERVICE_URL,regenerationDataAI);

        console.log("AI Regeneration Response", response);
        
       

        res.status(200).json({
          message: "AI regeneration requested successfully",
          regenerationData
        });

    } catch (pythonServiceError) {
      console.error("❌ Python service error:", pythonServiceError.message);
      res.status(500).json({ 
        message: "Failed to request AI regeneration",
        error: pythonServiceError.message 
      });
    }

  } catch (error) {
    next(error);
  }
};

// Send approved AI reply to customer
const sendApprovedReply = async (req, res, next) => {
  try {
    const { internalNoteId } = req.params;
    const agentId = req.user.id; // From auth middleware
    const { references } = req.body;

    console.log("🔍 AI Reply - Original references:", references);
    console.log("�� AI Reply - Type of references:", typeof references);
    
    const internalNote = await InternalNotes.findById(internalNoteId);
    if (!internalNote) {
      return res.status(404).json({ message: 'Internal note not found' });
    }
    
    if (internalNote.status !== 'approved') {
      return res.status(400).json({ message: 'Only approved suggestions can be sent' });
    }
    
    // Get ticket details
    const ticket = await Ticket.findById(internalNote.ticketId);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    // Handle references - ensure it's an array
    let fixedReferences = references;
    if (!Array.isArray(references)) {
      // If it's a JSON string, parse it
      try {
        fixedReferences = JSON.parse(references);
      } catch (e) {
        // If parsing fails, convert to array
        fixedReferences = references ? [references] : [];
      }
    }
    
    // Ensure it's an array
    if (!Array.isArray(fixedReferences)) {
      fixedReferences = [fixedReferences];
    }
    
    console.log("🔍 AI Reply - Fixed references:", fixedReferences);
    
    // Use the customer email stored in the internal note
    // This ensures we reply to the specific customer email that the AI suggestion was generated for
    const emailData = {
      to: internalNote.customerEmail, // Use the customer email from internal note
      subject: `Re: ${ticket.subject}`,
      text: internalNote.aiSuggestion,
      html: internalNote.aiSuggestion,
      inReplyTo: internalNote.messageId, // Reply to the specific message
      references: fixedReferences
    };
    
    console.log("🔍 AI Reply - Email data references:", emailData.references);
    
    const emailResult = await sendEmail(emailData);

    // Send to Python service with type 'approved_reply'
    try {
      const pythonServicePayload = {
        type: 'approved_reply',
        data: {
          ticketId: ticket._id,
          messageId: emailResult.messageId,
          customerEmail: internalNote.customerEmail,
          subject: ticket.subject,
          approvedReply: internalNote.aiSuggestion,
          rating: internalNote.rating
        }
      };
      
      await axios.post(process.env.PYTHON_SERVICE_URL, pythonServicePayload);
      console.log('📨 Approved AI reply sent to Python service');
    } catch (pythonError) {
      console.error("❌ Python service notification error:", pythonError.message);
      // Don't throw error - we still want to update status even if Python service fails
    }
    
    // Update internal note status
    internalNote.status = 'sent';
    await internalNote.save();
    
    // Update ticket with first response time if this is the first response
    if (!ticket.firstResponseAt) {
      await Ticket.findByIdAndUpdate(ticket._id, {
        firstResponseAt: new Date()
      });
    }
    
    res.status(200).json({ 
      message: 'AI reply sent successfully to customer',
      messageId: emailResult.messageId
    });
  } catch (error) {
    console.error("❌ Error in sendApprovedReply:", error);
    next(error);
  }
};

// Get all internal notes for a ticket
const getTicketInternalNotes = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    
    const internalNotes = await InternalNotes.find({ ticketId })
      .populate('agentId', 'name email')
      .sort({ createdAt: -1 });
    
    res.status(200).json(internalNotes);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAISuggestion,
  receiveAISuggestion,
  rateAISuggestion,
  sendApprovedReply,
  getTicketInternalNotes,
  requestAIRegeneration
};