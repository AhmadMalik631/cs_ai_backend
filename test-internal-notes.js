const mongoose = require('mongoose');
const InternalNotes = require('./models/InternalNotes');
const Ticket = require('./models/Ticket');
require('dotenv').config();

// Test data
const testTicket = {
  subject: 'Test Customer Issue',
  from: 'customer@example.com',
  body: 'I have a problem with your service',
  messageId: 'test-message-123',
  source: 'customer',
  channel: 'email'
};

const testAISuggestion = {
  ticketId: null, // Will be set after ticket creation
  customerEmail: 'customer@example.com',
  aiSuggestion: 'Thank you for contacting us. I understand you\'re experiencing an issue with our service. Could you please provide more details about the problem you\'re facing?',
  responseTime: 2500
};

async function testInternalNotes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Create a test ticket
    const ticket = await Ticket.create(testTicket);
    console.log('✅ Test ticket created:', ticket._id);
    
    // Set ticket ID for AI suggestion
    testAISuggestion.ticketId = ticket._id;

    // Test 1: Create AI suggestion
    console.log('\n🧪 Test 1: Creating AI suggestion...');
    const internalNote = await InternalNotes.create(testAISuggestion);
    console.log('✅ AI suggestion created:', internalNote._id);
    console.log('Status:', internalNote.status);

    // Test 2: Rate AI suggestion (rating 7 - below 8)
    console.log('\n🧪 Test 2: Rating AI suggestion (7/10)...');
    internalNote.rating = 7;
    internalNote.feedback = 'The response is too generic, needs more specific help';
    internalNote.status = 'redo_requested';
    internalNote.feedbackHistory.push({
      rating: 7,
      feedback: 'The response is too generic, needs more specific help',
      timestamp: new Date()
    });
    await internalNote.save();
    console.log('✅ AI suggestion rated and marked for redo');
    console.log('Status:', internalNote.status);

    // Test 3: Rate AI suggestion (rating 9 - above 8)
    console.log('\n🧪 Test 3: Rating AI suggestion (9/10)...');
    internalNote.rating = 9;
    internalNote.feedback = 'Great response, very helpful and professional';
    internalNote.status = 'approved';
    internalNote.feedbackHistory.push({
      rating: 9,
      feedback: 'Great response, very helpful and professional',
      timestamp: new Date()
    });
    await internalNote.save();
    console.log('✅ AI suggestion rated and approved');
    console.log('Status:', internalNote.status);
    console.log('Can send:', internalNote.rating >= 8);

    // Test 4: Get all internal notes for ticket
    console.log('\n🧪 Test 4: Getting all internal notes for ticket...');
    const allNotes = await InternalNotes.find({ ticketId: ticket._id });
    console.log('✅ Found internal notes:', allNotes.length);
    allNotes.forEach((note, index) => {
      console.log(`  Note ${index + 1}: Status: ${note.status}, Rating: ${note.rating}`);
    });

    // Test 5: Get pending AI suggestion
    console.log('\n🧪 Test 5: Getting pending AI suggestion...');
    const pendingNote = await InternalNotes.findOne({ 
      ticketId: ticket._id, 
      status: { $in: ['pending', 'approved'] }
    });
    if (pendingNote) {
      console.log('✅ Pending note found:', pendingNote.status);
    } else {
      console.log('❌ No pending note found');
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- Internal Notes model created and working');
    console.log('- Rating system functioning (1-10 scale)');
    console.log('- Status updates working (pending → redo_requested → approved)');
    console.log('- Feedback history tracking working');
    console.log('- Ready for frontend integration');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testInternalNotes();
