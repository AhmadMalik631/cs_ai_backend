const mongoose = require('mongoose');
const Ticket = require('./models/Ticket');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/dashboard')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

async function testSLA() {
  try {
    console.log('Testing SLA functionality...');
    
    // Get a few sample tickets
    const tickets = await Ticket.find({}).limit(5).sort({ date: -1 });
    
    console.log(`\nFound ${tickets.length} sample tickets:`);
    
    tickets.forEach((ticket, index) => {
      console.log(`\n--- Ticket ${index + 1} ---`);
      console.log(`Subject: ${ticket.subject}`);
      console.log(`Source: ${ticket.source}`);
      console.log(`Date: ${ticket.date}`);
      console.log(`SLA Deadline: ${ticket.slaDeadline}`);
      console.log(`SLA Breached: ${ticket.slaBreached}`);
      console.log(`First Response At: ${ticket.firstResponseAt}`);
      console.log(`Last Customer Message At: ${ticket.lastCustomerMessageAt}`);
      
      // Calculate current SLA status
      const now = new Date();
      const deadline = ticket.slaDeadline ? new Date(ticket.slaDeadline) : null;
      const isBreached = !ticket.firstResponseAt && deadline && now > deadline;
      
      console.log(`Current SLA Status: ${isBreached ? 'BREACHED' : 'ACTIVE'}`);
      if (deadline) {
        const timeLeft = deadline.getTime() - now.getTime();
        const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        console.log(`Time Left: ${hoursLeft}h ${minutesLeft}m`);
      }
    });
    
    // Test customer vs agent tickets
    const customerTickets = await Ticket.find({ source: 'customer' }).limit(3);
    const agentTickets = await Ticket.find({ source: 'agent' }).limit(3);
    
    console.log(`\nCustomer tickets with SLA: ${customerTickets.filter(t => t.slaDeadline).length}/${customerTickets.length}`);
    console.log(`Agent tickets with SLA: ${agentTickets.filter(t => t.slaDeadline).length}/${agentTickets.length}`);
    
  } catch (error) {
    console.error('Error testing SLA:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the test
testSLA();
