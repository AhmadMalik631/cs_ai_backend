const mongoose = require("mongoose");
const { Schema, Types } = mongoose;

const ticketSchema = new Schema({
  subject: String,
  from: String,
  to: [String],
  date: Date,
  body: String,
  inReplyTo: String,
  messageId:String,
  references: [String],
  attachments: [
    {
      filename: String,
      url: String,
    }
  ],
  tags: { type: [String], default: [] },
  onHold: {type :Date, default:null},
  channel:{type:String, default:""},
  assignedTo: { type: Types.ObjectId, default: null },
  status: { type: String, default: "open" },
  source: {
    type: String,
    enum: ['customer', 'agent', 'ai', 'unknown'],
    default: 'customer'
  },
  // SLA fields
  slaDeadline: { type: Date, default: null },
  slaBreached: { type: Boolean, default: false },
  firstResponseAt: { type: Date, default: null },
  lastCustomerMessageAt: { type: Date, default: null },
  // Merge-related fields
  mergedFrom: [{ type: Types.ObjectId, ref: 'Ticket' }], // Tickets that were merged into this one
  mergedInto: { type: Types.ObjectId, ref: 'Ticket' }, // Ticket this was merged into
  isMerged: { type: Boolean, default: false }, // Whether this ticket has been merged
  mergeDate: { type: Date, default: null }, // When the merge occurred
  mergeReason: { type: String, default: null }, // Reason for merge
  // Customer management for merged tickets - all emails available for selection
  allCustomerEmails: [{ type: String }], // All customer emails from merged tickets
  // Duplicate detection fields
  isDuplicate: { type: Boolean, default: false }, // Whether this ticket is a duplicate
  duplicateConfidence: { type: Number, default: 0 }, // Confidence level (0-100)
  duplicateType: { type: String, enum: ['exact', 'ai_detected', 'none'], default: 'none' }, // Type of duplicate detection
  duplicateOf: { type: Types.ObjectId, ref: 'Ticket' }, // Reference to the original ticket
  duplicateReason: { type: String, default: null }, // Reason for duplicate detection
  duplicateChecked: { type: Boolean, default: false }, // Whether duplicate check has been performed
  open: { type: String, default: "new" },
  lastMessage: { type: Date, default: Date.now }
});

ticketSchema.index({ inReplyTo: 1 });
ticketSchema.index({ messageId: 1 });
ticketSchema.index({ references: 1 });
ticketSchema.index({ date: -1 });
ticketSchema.index({ mergedFrom: 1 });
ticketSchema.index({ mergedInto: 1 });
ticketSchema.index({ isMerged: 1 });
ticketSchema.index({lastMessage: 1});

module.exports = mongoose.model("Ticket", ticketSchema);
