const mongoose = require('mongoose');
const Ticket = require('./models/Ticket');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dashboard')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

async function debugDuplicates() {
  try {
    console.log('🔍 Debugging duplicate detection...');
    
    // Find tickets with subject "test" and sender "Hasnain Abid Khanzada"
    const testTickets = await Ticket.find({
      subject: 'test',
      from: { $regex: /Hasnain Abid Khanzada/i }
    }).sort({ date: -1 });
    
    console.log(`Found ${testTickets.length} tickets with subject "test" from Hasnain:`);
    
    testTickets.forEach((ticket, index) => {
      console.log(`\n--- Ticket ${index + 1} ---`);
      console.log(`ID: ${ticket._id}`);
      console.log(`Subject: "${ticket.subject}"`);
      console.log(`From: "${ticket.from}"`);
      console.log(`Body: "${ticket.body}"`);
      console.log(`Date: ${ticket.date}`);
      console.log(`Is Duplicate: ${ticket.isDuplicate}`);
      console.log(`Duplicate Confidence: ${ticket.duplicateConfidence}%`);
      console.log(`Duplicate Type: ${ticket.duplicateType}`);
      console.log(`Duplicate Checked: ${ticket.duplicateChecked}`);
    });
    
    if (testTickets.length >= 2) {
      const ticket1 = testTickets[0];
      const ticket2 = testTickets[1];
      
      console.log('\n🔍 Comparing first two tickets:');
      console.log(`Ticket 1 ID: ${ticket1._id}`);
      console.log(`Ticket 2 ID: ${ticket2._id}`);
      console.log(`Same subject: ${ticket1.subject === ticket2.subject}`);
      console.log(`Same from: ${ticket1.from === ticket2.from}`);
      console.log(`Same body: ${ticket1.body === ticket2.body}`);
      
      // Manually check for exact duplicate
      const exactMatch = await Ticket.findOne({
        subject: ticket1.subject,
        from: ticket1.from,
        body: ticket1.body,
        _id: { $ne: ticket1._id },
        isMerged: { $ne: true }
      });
      
      if (exactMatch) {
        console.log('✅ EXACT DUPLICATE FOUND!');
        console.log(`Original: ${exactMatch._id}`);
        console.log(`Duplicate: ${ticket1._id}`);
        
        // Update both tickets
        await Ticket.findByIdAndUpdate(ticket1._id, {
          isDuplicate: true,
          duplicateConfidence: 100,
          duplicateType: 'exact',
          duplicateOf: exactMatch._id,
          duplicateChecked: true
        });
        
        await Ticket.findByIdAndUpdate(exactMatch._id, {
          isDuplicate: true,
          duplicateConfidence: 100,
          duplicateType: 'exact',
          duplicateOf: ticket1._id,
          duplicateChecked: true
        });
        
        console.log('✅ Updated both tickets with duplicate information!');
      } else {
        console.log('❌ No exact duplicate found in database');
      }
    }
    
  } catch (error) {
    console.error('Error debugging duplicates:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the script
debugDuplicates();
