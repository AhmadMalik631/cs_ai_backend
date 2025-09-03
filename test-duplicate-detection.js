const mongoose = require('mongoose');
const Ticket = require('./models/Ticket');
const DuplicateDetectionService = require('./utils/duplicateDetection');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/dashboard', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testDuplicateDetection() {
  try {
    console.log('Testing duplicate detection functionality...');

    // Clean up existing test tickets
    await Ticket.deleteMany({ 
      subject: { $regex: /Test Ticket|Order Issue/ },
      from: { $regex: /test@example\.com|customer/ }
    });

    // Create test tickets with similar content
    const ticket1 = new Ticket({
      subject: 'Order Issue - Cannot access my account',
      from: 'customer1@example.com',
      to: ['support@example.com'],
      date: new Date('2024-01-10'),
      body: 'I cannot access my account. My order #12345 is not showing up. Please help me resolve this issue.',
      messageId: 'msg1@example.com',
      status: 'open',
      source: 'customer'
    });

    const ticket2 = new Ticket({
      subject: 'Account Access Problem - Order #12345',
      from: 'customer2@example.com',
      to: ['support@example.com'],
      date: new Date('2024-01-15'),
      body: 'I am having trouble accessing my account. My order #12345 is missing from my dashboard. Need assistance.',
      messageId: 'msg2@example.com',
      status: 'open',
      source: 'customer'
    });

    const ticket3 = new Ticket({
      subject: 'Order Issue - Cannot access my account',
      from: 'customer1@example.com',
      to: ['support@example.com'],
      date: new Date('2024-01-20'),
      body: 'I cannot access my account. My order #12345 is not showing up. Please help me resolve this issue.',
      messageId: 'msg3@example.com',
      status: 'open',
      source: 'customer'
    });

    // Save tickets
    await ticket1.save();
    await ticket2.save();
    await ticket3.save();

    console.log('Created test tickets:', {
      ticket1: ticket1._id,
      ticket2: ticket2._id,
      ticket3: ticket3._id
    });

    // Test duplicate detection on ticket1
    console.log('\n=== Testing duplicate detection for ticket1 ===');
    const duplicates1 = await DuplicateDetectionService.getAllDuplicates(ticket1);
    console.log('Duplicates found for ticket1:', duplicates1.length);
    
    duplicates1.forEach((dup, index) => {
      console.log(`Duplicate ${index + 1}:`, {
        ticketId: dup.ticket._id,
        subject: dup.ticket.subject,
        from: dup.ticket.from,
        confidence: dup.confidence,
        type: dup.type,
        reason: dup.reason
      });
    });

    // Test duplicate detection on ticket2
    console.log('\n=== Testing duplicate detection for ticket2 ===');
    const duplicates2 = await DuplicateDetectionService.getAllDuplicates(ticket2);
    console.log('Duplicates found for ticket2:', duplicates2.length);
    
    duplicates2.forEach((dup, index) => {
      console.log(`Duplicate ${index + 1}:`, {
        ticketId: dup.ticket._id,
        subject: dup.ticket.subject,
        from: dup.ticket.from,
        confidence: dup.confidence,
        type: dup.type,
        reason: dup.reason
      });
    });

    // Test duplicate detection on ticket3 (exact duplicate of ticket1)
    console.log('\n=== Testing duplicate detection for ticket3 ===');
    const duplicates3 = await DuplicateDetectionService.getAllDuplicates(ticket3);
    console.log('Duplicates found for ticket3:', duplicates3.length);
    
    duplicates3.forEach((dup, index) => {
      console.log(`Duplicate ${index + 1}:`, {
        ticketId: dup.ticket._id,
        subject: dup.ticket.subject,
        from: dup.ticket.from,
        confidence: dup.confidence,
        type: dup.type,
        reason: dup.reason
      });
    });

    // Test the main detectDuplicates method
    console.log('\n=== Testing main detectDuplicates method ===');
    const duplicateInfo1 = await DuplicateDetectionService.detectDuplicates(ticket1);
    console.log('Duplicate info for ticket1:', {
      isDuplicate: duplicateInfo1.isDuplicate,
      confidence: duplicateInfo1.confidence,
      type: duplicateInfo1.type,
      reason: duplicateInfo1.reason
    });

    console.log('\nTest completed successfully!');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

testDuplicateDetection();
