const mongoose = require('mongoose');
const Ticket = require('./models/Ticket');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dashboard')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

async function checkExactDuplicates() {
  try {
    console.log('Starting exact duplicate detection for all tickets...');
    
    // Get all tickets that haven't been checked for duplicates
    const tickets = await Ticket.find({ 
      duplicateChecked: { $ne: true },
      isMerged: { $ne: true }
    }).sort({ date: -1 });
    
    console.log(`Found ${tickets.length} tickets to check for exact duplicates`);
    
    let processed = 0;
    let duplicatesFound = 0;
    
    for (const ticket of tickets) {
      try {
        console.log(`Checking ticket: ${ticket.subject} (${ticket._id})`);
        
        // Check for exact duplicates (same subject, sender, and content)
        const exactMatch = await Ticket.findOne({
          subject: ticket.subject,
          from: ticket.from,
          body: ticket.body,
          _id: { $ne: ticket._id }, // Exclude self
          isMerged: { $ne: true } // Exclude merged tickets
        });

        if (exactMatch) {
          duplicatesFound++;
          console.log(`✅ EXACT DUPLICATE FOUND: ${ticket.subject}`);
          console.log(`   Original: ${exactMatch._id} (${exactMatch.date})`);
          console.log(`   Duplicate: ${ticket._id} (${ticket.date})`);
          
          // Update both tickets with duplicate information
          await Ticket.findByIdAndUpdate(ticket._id, {
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
            duplicateOf: ticket._id,
            duplicateChecked: true
          });
        } else {
          // Mark as checked but not duplicate
          await Ticket.findByIdAndUpdate(ticket._id, {
            isDuplicate: false,
            duplicateConfidence: 0,
            duplicateType: 'none',
            duplicateChecked: true
          });
        }
        
        processed++;
        console.log(`Progress: ${processed}/${tickets.length}`);
        
      } catch (error) {
        console.error(`Error checking ticket ${ticket._id}:`, error.message);
      }
    }
    
    console.log(`\n✅ Exact duplicate detection completed!`);
    console.log(`📊 Processed: ${processed} tickets`);
    console.log(`🔍 Exact duplicates found: ${duplicatesFound}`);
    
  } catch (error) {
    console.error('Error in duplicate detection:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the script
checkExactDuplicates();
