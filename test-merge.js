const mongoose = require('mongoose');
const Ticket = require('./models/Ticket');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/dashboard', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function testMergeFunctionality() {
  try {
    console.log('Testing merge functionality...');

    // Create test tickets
    const ticket1 = new Ticket({
      subject: 'Test Ticket 1 - Order Issue',
      from: 'customer1@example.com',
      to: ['support@example.com'],
      date: new Date('2024-01-10'),
      body: 'I have an issue with my order #12345',
      messageId: 'msg1@example.com',
      status: 'open',
      source: 'customer'
    });

    const ticket2 = new Ticket({
      subject: 'Test Ticket 2 - Same Order Issue',
      from: 'customer2@example.com',
      to: ['support@example.com'],
      date: new Date('2024-01-20'),
      body: 'I also have an issue with order #12345',
      messageId: 'msg2@example.com',
      status: 'open',
      source: 'customer'
    });

    const ticket3 = new Ticket({
      subject: 'Test Ticket 3 - Related Issue',
      from: 'customer1@example.com',
      to: ['support@example.com'],
      date: new Date('2024-01-15'),
      body: 'This is related to the previous issue',
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

    // Test merge functionality
    const mergeData = {
      ticketIds: [ticket1._id.toString(), ticket2._id.toString(), ticket3._id.toString()],
      primaryTicketId: ticket1._id.toString(),
      reason: 'All tickets related to order #12345'
    };

    console.log('Merging tickets...');
    
    // Simulate the merge process
    const ticketsToMerge = await Ticket.find({ _id: { $in: mergeData.ticketIds } });
    const primaryTicket = ticketsToMerge.find(ticket => ticket._id.toString() === mergeData.primaryTicketId);
    const otherTickets = ticketsToMerge.filter(ticket => ticket._id.toString() !== mergeData.primaryTicketId);

    // Sort tickets by date to determine primary customer
    const sortedTickets = ticketsToMerge.sort((a, b) => new Date(a.date) - new Date(b.date));
    const primaryCustomer = sortedTickets[0].from;

    // Collect all unique customers for CC
    const allCustomers = new Set();
    ticketsToMerge.forEach(ticket => {
      if (ticket.from) allCustomers.add(ticket.from);
      if (ticket.to) ticket.to.forEach(email => allCustomers.add(email));
    });
    allCustomers.delete(primaryCustomer);

    // Update primary ticket
    const mergeUpdate = {
      mergedFrom: otherTickets.map(ticket => ticket._id),
      mergeDate: new Date(),
      mergeReason: mergeData.reason,
      primaryCustomer: primaryCustomer,
      ccCustomers: Array.from(allCustomers),
      subject: `${primaryTicket.subject} (Merged from ${otherTickets.length} related tickets)`
    };

    const updatedPrimaryTicket = await Ticket.findByIdAndUpdate(
      mergeData.primaryTicketId,
      mergeUpdate,
      { new: true, runValidators: true }
    );

    // Mark other tickets as merged
    const mergePromises = otherTickets.map(ticket =>
      Ticket.findByIdAndUpdate(ticket._id, {
        mergedInto: mergeData.primaryTicketId,
        isMerged: true,
        mergeDate: new Date(),
        mergeReason: mergeData.reason,
        status: "merged"
      })
    );

    await Promise.all(mergePromises);

    console.log('Merge completed successfully!');
    console.log('Primary ticket:', updatedPrimaryTicket._id);
    console.log('Merged tickets count:', otherTickets.length);
    console.log('Primary customer:', primaryCustomer);
    console.log('CC customers:', Array.from(allCustomers));

    // Test fetching merged ticket
    const mergedTicket = await Ticket.findById(mergeData.primaryTicketId);
    console.log('Merged ticket details:', {
      subject: mergedTicket.subject,
      mergedFrom: mergedTicket.mergedFrom,
      primaryCustomer: mergedTicket.primaryCustomer,
      ccCustomers: mergedTicket.ccCustomers,
      isMerged: mergedTicket.isMerged
    });

    console.log('Test completed successfully!');

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    mongoose.connection.close();
  }
}

testMergeFunctionality();
