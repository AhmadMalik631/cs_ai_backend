const express = require('express');
const router = express.Router();
const { 
  getAISuggestion, 
  receiveAISuggestion, 
  rateAISuggestion, 
  sendApprovedReply, 
  getTicketInternalNotes,
  requestAIRegeneration
} = require('../controllers/internalNotesController');
const protect = require('../middleware/authMiddleware');

// Public endpoint for Python service to send AI suggestions
router.post('/ai-suggestion', receiveAISuggestion);

// Protected routes for agents
router.get('/ticket/:ticketId', protect, getTicketInternalNotes);
router.get('/suggestion/:ticketId', protect, getAISuggestion);
router.post('/rate/:internalNoteId', protect, rateAISuggestion);
router.post('/send/:internalNoteId', protect, sendApprovedReply);

// Request AI regeneration for low-rated suggestions
router.post('/request-redo/:internalNoteId', protect, requestAIRegeneration);

module.exports = router;