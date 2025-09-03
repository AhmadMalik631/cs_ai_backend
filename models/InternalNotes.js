const mongoose = require('mongoose');

const internalNotesSchema = new mongoose.Schema({
  ticketId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ticket',
    required: true
  },
  // Add messageId to track which specific email this AI suggestion is for
  messageId: {
    type: String,
    required: true
  },
  // Add customerEmail to track which customer email this is replying to
  customerEmail: {
    type: String,
    required: true
  },
  aiSuggestion: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 10,
    default: null
  },
  feedback: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'sent', 'redo_requested','feedback_submitted'],
    default: 'pending'
  },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  aiResponseTime: {
    type: Number, // milliseconds
    default: null
  },
  // Future fields for AI regeneration
  feedbackHistory: [{
    rating: {
      type: Number,
      min: 1,
      max: 10
    },
    feedback: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  regenerationCount: {
    type: Number,
    default: 0
  },
  lastRegenerationAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient queries
internalNotesSchema.index({ ticketId: 1, status: 1 });
internalNotesSchema.index({ messageId: 1, status: 1 });
internalNotesSchema.index({ agentId: 1, status: 1 });
internalNotesSchema.index({ ticketId: 1, messageId: 1 }); // Compound index for ticket + message

module.exports = mongoose.model('InternalNotes', internalNotesSchema);
