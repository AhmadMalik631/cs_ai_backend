const Ticket = require("../models/Ticket");
const DuplicateDetectionService = require("../utils/duplicateDetection");

// Fetch tickets
const fetchTickets = async (req, res, next) => {
  try {
    let tickets;
    let totalCount;

    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Base query: only root-level emails (no replies) and not merged tickets
    const threadRootFilter = {
      $and: [
        {
          $or: [
            { inReplyTo: { $exists: false } },
            { inReplyTo: null },
            { inReplyTo: '' }
          ]
        },
        {
          $or: [
            { references: { $exists: false } },
            { references: { $size: 0 } },
            { references: [] }
          ]
        },
        { isMerged: { $ne: true } } // Exclude merged tickets from main list
      ]
    };

    let sortOption = { date: -1 }
    let mongoQuery = {};

    if (req.query.query) {
      const parsedQuery = JSON.parse(req.query.query);

      if (parsedQuery.sort) {
        sortOption = parsedQuery.sort;
        delete parsedQuery.sort; 
      }

      mongoQuery = parsedQuery;
      
      // Get total count for pagination
      totalCount = await Ticket.countDocuments({
        $and: [threadRootFilter, mongoQuery]
      });
      
      tickets = await Ticket.find({
        $and: [threadRootFilter, mongoQuery]
      })
      // .sort(sortOption).skip(skip).limit(limit);

    } else {
      // Get total count for pagination
      totalCount = await Ticket.countDocuments(threadRootFilter);
      
      tickets = await Ticket.find(threadRootFilter)
        // .sort(sortOption)
        // .skip(skip)
        // .limit(limit);
    }
    
    // Enhance each ticket with calculated SLA status and check for duplicates
    const now = Date.now();
    const enhancedTickets = await Promise.all(tickets.map(async (ticket) => {
      const t = ticket.toObject();
      // Calculate SLA breach status: breached if no response and deadline has passed
      t.slaBreached = !t.firstResponseAt && t.slaDeadline && (now > new Date(t.slaDeadline).getTime());
      
      // Check for duplicates if not already checked
      if (!t.duplicateChecked) {
        try {
          const duplicateInfo = await DuplicateDetectionService.detectDuplicates(ticket);
          await DuplicateDetectionService.updateTicketDuplicateStatus(ticket._id, duplicateInfo);
          
          // Update the ticket object with duplicate info
          if (duplicateInfo.isDuplicate) {
            t.isDuplicate = duplicateInfo.isDuplicate;
            t.duplicateConfidence = duplicateInfo.confidence;
            t.duplicateType = duplicateInfo.type;
            t.duplicateOf = duplicateInfo.duplicateOf;
            t.duplicateChecked = true;
          }
        } catch (error) {
          console.error('Duplicate detection failed for ticket:', ticket._id, error);
        }
      }
      
      return t;
    }));
    
    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    res.status(200).json({ 
      message: "Root-level tickets fetched", 
      data: enhancedTickets,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    next(error);
  }
};

const getSingleTicket = async (req, res, next) => {
  try {
    const { id } = req.params;

    const ticket = await Ticket.findById(id);

    if (!ticket) {
      return res.status(404).json({ message: "ticket not found" });
    }

    // Fetch all thread replies (excluding the original ticket itself)
    const threadReplies = await Ticket.find({
      $or: [
        { inReplyTo: ticket.messageId },
        { references: ticket.messageId },
        { references: { $in: [ticket.messageId] } }
      ]
    }).sort({ date: 1 });

    // If this is a merged ticket, also fetch the merged tickets
    let mergedTickets = [];
    if (ticket.mergedFrom && ticket.mergedFrom.length > 0) {
      mergedTickets = await Ticket.find({
        _id: { $in: ticket.mergedFrom }
      }).sort({ date: 1 });
    }

    // Combine ticket + thread + merged tickets
    const allTickets = [...mergedTickets, ticket, ...threadReplies];
    const fullThread = allTickets.map(t => {
      const obj = t.toObject();
      // Calculate SLA breach status: breached if no response and deadline has passed
      obj.slaBreached = !obj.firstResponseAt && obj.slaDeadline && (Date.now() > new Date(obj.slaDeadline).getTime());
      
      // If this is the primary ticket and it has allCustomerEmails, preserve it
      if (t._id.toString() === ticket._id.toString() && ticket.allCustomerEmails) {
        obj.allCustomerEmails = ticket.allCustomerEmails;
      }
      
      return obj;
    });

    res.status(200).json({
      message: "ticket and thread fetched",
      data: fullThread
    });
  } catch (error) {
    next(error);
  }
};

const updateTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // If this is an agent response, update the firstResponseAt field
    if (updates.source === 'agent' || updates.status === 'responded') {
      updates.firstResponseAt = new Date();
    }

    const updatedTicket = await Ticket.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!updatedTicket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Automatically check for duplicates after ticket update
    try {
      const duplicateInfo = await DuplicateDetectionService.detectDuplicates(updatedTicket);
      await DuplicateDetectionService.updateTicketDuplicateStatus(id, duplicateInfo);
      
      // Fetch the updated ticket with duplicate information
      const ticketWithDuplicates = await Ticket.findById(id);
      res.status(200).json({ message: "Ticket updated", data: ticketWithDuplicates });
    } catch (duplicateError) {
      console.error('Duplicate detection failed:', duplicateError);
      // Still return the updated ticket even if duplicate detection fails
      res.status(200).json({ message: "Ticket updated", data: updatedTicket });
    }
  } catch (error) {
    next(error);
  }
};

// Merge tickets functionality
const mergeTickets = async (req, res, next) => {
  try {
    const { ticketIds, primaryTicketId, reason } = req.body;

    if (!ticketIds || ticketIds.length < 2) {
      return res.status(400).json({ message: "At least 2 tickets are required for merging" });
    }

    if (!primaryTicketId || !ticketIds.includes(primaryTicketId)) {
      return res.status(400).json({ message: "Primary ticket must be one of the tickets to merge" });
    }

    // Fetch all tickets to merge
    const ticketsToMerge = await Ticket.find({ _id: { $in: ticketIds } });
    
    if (ticketsToMerge.length !== ticketIds.length) {
      return res.status(404).json({ message: "One or more tickets not found" });
    }

    // Check if any tickets are already merged
    const alreadyMerged = ticketsToMerge.filter(ticket => ticket.isMerged);
    if (alreadyMerged.length > 0) {
      return res.status(400).json({ message: "One or more tickets are already merged" });
    }

    // Find the primary ticket (the one that will remain)
    const primaryTicket = ticketsToMerge.find(ticket => ticket._id.toString() === primaryTicketId);
    const otherTickets = ticketsToMerge.filter(ticket => ticket._id.toString() !== primaryTicketId);

    // Collect all unique customers for the dropdown in chronological order
    const allCustomers = [];
    const seenEmails = new Set();
    
    // Sort tickets by date to ensure chronological order
    const sortedTickets = ticketsToMerge.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    sortedTickets.forEach(ticket => {
      // Add from email if not seen
      if (ticket.from && !seenEmails.has(ticket.from)) {
        allCustomers.push(ticket.from);
        seenEmails.add(ticket.from);
      }
      
      // Add to emails if not seen
      if (ticket.to) {
        ticket.to.forEach(email => {
          if (!seenEmails.has(email)) {
            allCustomers.push(email);
            seenEmails.add(email);
          }
        });
      }
    });

    console.log('Merge Debug:', {
      ticketsToMerge: ticketsToMerge.map(t => ({ id: t._id, from: t.from, to: t.to })),
      allCustomers: Array.from(allCustomers),
      primaryTicketId,
      reason
    });

    // Update primary ticket with merge information
    const mergeUpdate = {
      mergedFrom: otherTickets.map(ticket => ticket._id),
      mergeDate: new Date(),
      mergeReason: reason || "Tickets merged by support agent",
      // Store all customer emails for dropdown selection (in chronological order)
      allCustomerEmails: allCustomers,
      // Update subject to indicate merged tickets
      subject: `${primaryTicket.subject} (Merged from ${otherTickets.length} related tickets)`
    };

    const updatedPrimaryTicket = await Ticket.findByIdAndUpdate(
      primaryTicketId,
      mergeUpdate,
      { new: true, runValidators: true }
    );

    // Mark other tickets as merged
    const mergePromises = otherTickets.map(ticket =>
      Ticket.findByIdAndUpdate(ticket._id, {
        mergedInto: primaryTicketId,
        isMerged: true,
        mergeDate: new Date(),
        mergeReason: reason || "Merged into related ticket",
        status: "merged"
      })
    );

    await Promise.all(mergePromises);

    res.status(200).json({
      message: "Tickets merged successfully",
      data: {
        primaryTicket: updatedPrimaryTicket,
        mergedTickets: otherTickets.length,
        allCustomerEmails: allCustomers
      }
    });

  } catch (error) {
    next(error);
  }
};

// Get merge suggestions based on similar subjects or customers
const getMergeSuggestions = async (req, res, next) => {
  try {
    const { ticketId } = req.params;
    
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Find tickets with similar subjects or same customer
    const suggestions = await Ticket.find({
      _id: { $ne: ticketId },
      isMerged: { $ne: true },
      $or: [
        { subject: { $regex: ticket.subject.split(' ').slice(0, 3).join(' '), $options: 'i' } },
        { from: ticket.from },
        { to: { $in: ticket.to } }
      ]
    })
    .sort({ date: -1 })
    .limit(10);

    res.status(200).json({
      message: "Merge suggestions found",
      data: suggestions
    });

  } catch (error) {
    next(error);
  }
};

// Check for duplicates when a ticket is created or updated
const checkDuplicates = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Run duplicate detection
    const duplicateInfo = await DuplicateDetectionService.detectDuplicates(ticket);
    
    // Update ticket with duplicate information
    await DuplicateDetectionService.updateTicketDuplicateStatus(id, duplicateInfo);

    // Get all duplicates for this ticket
    const allDuplicates = await DuplicateDetectionService.getAllDuplicates(ticket);

    res.status(200).json({
      message: "Duplicate check completed",
      data: {
        isDuplicate: duplicateInfo.isDuplicate,
        confidence: duplicateInfo.confidence,
        type: duplicateInfo.type,
        reason: duplicateInfo.reason,
        allDuplicates: allDuplicates
      }
    });

  } catch (error) {
    console.error('❌ Error in checkDuplicates:', error);
    next(error);
  }
};

// Get all duplicates for a specific ticket
const getTicketDuplicates = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Get all duplicates for this ticket
    const allDuplicates = await DuplicateDetectionService.getAllDuplicates(ticket);
    
    // Extract the ticket objects from the duplicates array
    const duplicateTickets = allDuplicates.map(dup => dup.ticket).filter(ticket => ticket);

    res.status(200).json({
      message: "Ticket duplicates fetched",
      data: duplicateTickets
    });

  } catch (error) {
    next(error);
  }
};

// Get all duplicate tickets
const getDuplicateTickets = async (req, res, next) => {
  try {
    const duplicates = await Ticket.find({
      isDuplicate: true,
      isMerged: { $ne: true }
    }).sort({ date: -1 });

    res.status(200).json({
      message: "Duplicate tickets fetched",
      data: duplicates
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  fetchTickets, 
  getSingleTicket, 
  updateTicket, 
  mergeTickets, 
  getMergeSuggestions,
  checkDuplicates,
  getDuplicateTickets,
  getTicketDuplicates
};