const mongoose = require('mongoose');
const Ticket = require('./models/Ticket');
const DuplicateDetectionService = require('./utils/duplicateDetection');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dashboard')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

async function checkAllDuplicates() {
  try {
    console.log('Starting duplicate detection for all tickets...');
    
    // Get all tickets that haven't been checked for duplicates
    const tickets = await Ticket.find({ 
      duplicateChecked: { $ne: true },
      isMerged: { $ne: true }
    }).sort({ date: -1 });
    
    console.log(`Found ${tickets.length} tickets to check for duplicates`);
    
    let processed = 0;
    let duplicatesFound = 0;
    
    for (const ticket of tickets) {
      try {
        console.log(`Checking ticket: ${ticket.subject} (${ticket._id})`);
        
        const duplicateInfo = await DuplicateDetectionService.detectDuplicates(ticket);
        await DuplicateDetectionService.updateTicketDuplicateStatus(ticket._id, duplicateInfo);
        
        if (duplicateInfo.isDuplicate) {
          duplicatesFound++;
          console.log(`✅ Duplicate found: ${ticket.subject} - ${duplicateInfo.confidence}% confidence (${duplicateInfo.type})`);
        }
        
        processed++;
        console.log(`Progress: ${processed}/${tickets.length}`);
        
      } catch (error) {
        console.error(`Error checking ticket ${ticket._id}:`, error.message);
      }
    }
    
    console.log(`\n✅ Duplicate detection completed!`);
    console.log(`📊 Processed: ${processed} tickets`);
    console.log(`🔍 Duplicates found: ${duplicatesFound}`);
    
  } catch (error) {
    console.error('Error in duplicate detection:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the script
checkAllDuplicates();
