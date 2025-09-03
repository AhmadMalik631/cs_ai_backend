# Internal Notes an           If rating < 8                                                 ↓
                ↓                                                 ↓
         Status: approved                                Status: feedback_submitted
         Send button enabled                            Feedback required
                ↓                                                 ↓
         Agent sends reply                              Agent clicks "Redo"
                ↓                                                 ↓
    Email sent to customer                        Status: regenerating
    Notification to Python service                Python service regenerates
         (type: approved_reply)                           ↓
                ↓                                  New AI suggestion
         Status: sent                                    ↓
                                                 Back to review processystem

## Overview
The Internal Notes system manages AI-generated email replies, allowing agents to review, rate, and manage AI suggestions before sending them to customers. This system includes features for initial AI suggestions, quality control through agent ratings, regeneration of low-rated replies, and tracking of approved responses.

## System Architecture

### Complete Flow
```
1. Initial AI Generation:
Customer Email → Node.js Backend → Webhook → Python AI Service
                                          ↓
                                   AI Reply generated
                                          ↓
                                   Stored in Internal Notes
                                          ↓
2. Agent Review Process:
                                   Agent reviews & rates (1-10 scale)
                                          ↓
           If rating ≥ 8                                     If rating < 8
                ↓                                                 ↓
         Status: approved                                Status: redo_requested
         Send button enabled                            Feedback required
                ↓                                                 ↓
         Agent sends reply                              Agent clicks "Redo"
                ↓                                                 ↓
    Email sent to customer                        Python service regenerates
    Notification to Python service                         ↓
         (type: approved_reply)                    New AI suggestion
                ↓                                          ↓
         Status: sent                              Back to review process
```

## Database Schema

### InternalNotes Model
```javascript
{
  ticketId: ObjectId,           // Reference to Ticket
  messageId: String,            // Message ID being replied to
  customerEmail: String,        // Customer's email address
  aiSuggestion: String,         // AI-generated reply text
  rating: Number (1-10),        // Agent rating
  feedback: String,             // Agent feedback for low ratings
  status: String,               // Status of the suggestion (see Status Values)
  agentId: ObjectId,            // Agent who rated/sent the suggestion
  aiResponseTime: Number,       // Time AI took to respond (ms)
  feedbackHistory: [{           // History of ratings and feedback
    rating: Number,
    feedback: String,
    timestamp: Date
  }],
  regenerationCount: Number,    // Number of times AI regenerated
  lastRegenerationAt: Date,     // Last regeneration timestamp
  timestamps: true              // createdAt, updatedAt
}
```

## API Endpoints

### 1. Get AI Suggestion
```
GET /api/internal-notes/suggestion/:ticketId
Headers: Authorization: Bearer <token>
```

### 2. Receive AI Suggestion (From Python Service)
```
POST /api/internal-notes/ai-suggestion
Body: {
  ticketId: String,
  customerEmail: String,
  aiSuggestion: String,
  messageId: String,
  responseTime: Number (optional)
}
```

### 3. Rate AI Suggestion
```
POST /api/internal-notes/rate/:internalNoteId
Headers: Authorization: Bearer <token>
Body: {
  rating: Number (1-10),
  feedback: String (required if rating < 8)
}
```

### 4. Request AI Regeneration
```
POST /api/internal-notes/request-redo/:internalNoteId
Headers: Authorization: Bearer <token>
```

### 5. Send Approved Reply
```
POST /api/internal-notes/send/:internalNoteId
Headers: Authorization: Bearer <token>
Body: {
  references: Array<String>  // Message IDs for email threading
}
```

## Communication with Python Service

### 1. Customer Email Processing
```javascript
// Sent when new customer email arrives
{
  type: 'customer_email',
  data: {
    // Ticket data
  }
}
```

### 2. Approved Reply Notification
```javascript
// Sent when agent approves and sends AI reply
{
  type: 'approved_reply',
  data: {
    ticketId: String,
    messageId: String,
    customerEmail: String,
    subject: String,
    approvedReply: String,
    rating: Number
  }
}
```

### 3. Regeneration Request
```javascript
// Sent when agent requests regeneration
{
  type: 'regenerate_reply',
  data: {
    ticketId: String,
    messageId: String,
    customerEmail: String,
    body: {
      subject: String,
      body: String
    },
    agentFeedback: String,
    originalAISuggestion: String
  }
}
```

## Status Values

- `pending`: Initial AI suggestion, not yet rated
- `approved`: Rated 8+, ready to send
- `feedback_submitted`: Rated < 8, feedback provided
- `regenerating`: AI regeneration in progress
- `sent`: AI reply has been sent to customer

## Error Handling

- **Missing feedback**: Returns 400 error for ratings < 8 without feedback
- **Unauthorized**: Returns 403 if agent doesn't have permission
- **Python service errors**: Logged but non-blocking for approved replies
- **Missing data**: Returns appropriate 404 errors for missing resources

## Environment Variables Required

```bash
PYTHON_SERVICE_URL=http://localhost:5000  # Python service endpoint
```

## Development Guide

### Key Files and Their Purposes

#### Backend Files
- `controllers/internalNotesController.js`
  - Main logic for AI suggestions and internal notes
  - Functions: getAISuggestion, receiveAISuggestion, rateAISuggestion, sendApprovedReply, requestAIRegeneration
  - Status management for suggestions
  - Python service communication

- `models/InternalNotes.js`
  - Database schema for internal notes
  - Stores AI suggestions, ratings, feedback
  - Tracks suggestion status and history

- `routes/internalNotesRoutes.js`
  - API route definitions
  - Endpoint: /api/internal-notes/*
  - Authentication middleware integration

- `jobs/EmailMonitor.js`
  - Monitors incoming emails
  - Sends customer emails to Python service
  - Uses type: 'customer_email'

#### Frontend Files
- `components/InternalNotes.jsx`
  - AI suggestion display
  - Rating interface
  - Regeneration UI
  - Status management

- `lib/InternalNotes.js`
  - Frontend API calls
  - State management for internal notes
  - Rating and feedback submission

### Common Modification Scenarios

1. **Modifying AI Response Flow**
   - Update `EmailMonitor.js` for incoming email handling
   - Modify `internalNotesController.js` receiveAISuggestion function
   - Update Python service payload structure

2. **Changing Rating System**
   - Modify `rateAISuggestion` in internalNotesController.js
   - Update rating thresholds (currently 8)
   - Adjust status transitions

3. **Adding New Status**
   - Add status to InternalNotes model
   - Update status transitions in controller
   - Modify frontend to handle new status

4. **Python Service Integration**
   - All Python service calls use PYTHON_SERVICE_URL
   - Three types: customer_email, approved_reply, regenerate_reply
   - Payload structures defined in documentation

### Status Transition Rules
```
pending → {
  rating >= 8 → approved → sent
  rating < 8 → feedback_submitted → regenerating → pending
}
```

## Testing

### Test Scripts Available
- `test-internal-notes.js`: Tests basic internal notes functionality
- `test-regeneration.js`: Tests AI regeneration flow
- `test-duplicate-detection.js`: Tests duplicate ticket handling

### Manual Testing Steps
1. Monitor new customer email processing
2. Review AI suggestion generation
3. Test rating system (both high and low ratings)
4. Verify regeneration flow for low ratings
5. Confirm approved replies are sent correctly
6. Validate Python service notifications
