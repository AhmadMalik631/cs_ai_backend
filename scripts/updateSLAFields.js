require('dotenv').config();
const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dashboard')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

async function updateSLAFields() {
  try {
    console.log('Starting SLA fields update for all tickets...');
    
    // Get all tickets that need SLA fields updated
    const tickets = await Ticket.find({});
    
    console.log(`Found ${tickets.length} tickets to update SLA fields`);
    
    let processed = 0;
    let updated = 0;
    
    for (const ticket of tickets) {
      try {
        const updates = {};
        let needsUpdate = false;
        
        // Only set SLA fields for customer emails
        if (ticket.source === 'customer') {
          // If no SLA deadline is set, set it to 24 hours from the ticket date
          if (!ticket.slaDeadline) {
            const ticketDate = ticket.date || new Date();
            updates.slaDeadline = new Date(ticketDate.getTime() + 24 * 60 * 60 * 1000);
            needsUpdate = true;
          }
          
          // Set slaBreached to false if not set
          if (ticket.slaBreached === null || ticket.slaBreached === undefined) {
            updates.slaBreached = false;
            needsUpdate = true;
          }
          
          // Set lastCustomerMessageAt if not set
          if (!ticket.lastCustomerMessageAt) {
            updates.lastCustomerMessageAt = ticket.date || new Date();
            needsUpdate = true;
          }
        } else {
          // For agent emails, ensure SLA fields are null
          if (ticket.slaDeadline !== null) {
            updates.slaDeadline = null;
            needsUpdate = true;
          }
          if (ticket.slaBreached !== null) {
            updates.slaBreached = null;
            needsUpdate = true;
          }
          if (ticket.firstResponseAt !== null) {
            updates.firstResponseAt = null;
            needsUpdate = true;
          }
          if (ticket.lastCustomerMessageAt !== null) {
            updates.lastCustomerMessageAt = null;
            needsUpdate = true;
          }
        }
        
        if (needsUpdate) {
          await Ticket.findByIdAndUpdate(ticket._id, updates);
          updated++;
        }
        
        processed++;
        if (processed % 100 === 0) {
          console.log(`Progress: ${processed}/${tickets.length}`);
        }
        
      } catch (error) {
        console.error(`Error updating ticket ${ticket._id}:`, error.message);
      }
    }
    
    console.log(`\n✅ SLA fields update completed!`);
    console.log(`📊 Processed: ${processed} tickets`);
    console.log(`🔄 Updated: ${updated} tickets`);
    
  } catch (error) {
    console.error('Error in SLA fields update:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the script
updateSLAFields();