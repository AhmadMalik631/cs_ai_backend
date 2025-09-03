const Ticket = require('../models/Ticket');
const OpenAI = require('openai');
require('dotenv').config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class DuplicateDetectionService {
  /**
   * Check for exact duplicates (same subject, sender, and content)
   */
  static async checkExactDuplicate(ticket) {
    console.log(`🔍 Checking exact duplicates for ticket: ${ticket.subject} from ${ticket.from}`);
    
    const exactMatch = await Ticket.findOne({
      subject: ticket.subject,
      from: ticket.from,
      body: ticket.body,
      _id: { $ne: ticket._id }, // Exclude self
      isMerged: { $ne: true }, // Exclude merged tickets
      date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    });

    if (exactMatch) {
      console.log(`✅ Exact duplicate found: ${exactMatch.subject} (ID: ${exactMatch._id})`);
      return {
        isDuplicate: true,
        confidence: 100,
        type: 'exact',
        duplicateOf: exactMatch._id,
        reason: 'Exact match: same subject, sender, and content'
      };
    }

    console.log(`❌ No exact duplicate found for: ${ticket.subject}`);
    return { isDuplicate: false, confidence: 0, type: 'none' };
  }

  /**
   * Check for similar content using OpenAI
   */
  static async checkContentSimilarity(ticket1, ticket2) {
    try {
      const prompt = `
        Compare these two support tickets and determine if they are about the same issue.
        
        Ticket 1:
        Subject: ${ticket1.subject}
        Content: ${ticket1.body}
        
        Ticket 2:
        Subject: ${ticket2.subject}
        Content: ${ticket2.body}
        
        Respond with JSON only:
        {
          "similar": true/false,
          "confidence": 0-100,
          "reason": "brief explanation of why they are similar or different"
        }
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 200
      });

      const result = JSON.parse(response.choices[0].message.content);
      return result;
    } catch (error) {
      console.error('OpenAI API error:', error);
      return { similar: false, confidence: 0, reason: 'API error' };
    }
  }

  /**
   * Check for AI-detected duplicates
   */
  static async checkAIDuplicates(ticket) {
    console.log(`🤖 Checking AI duplicates for ticket: ${ticket.subject}`);
    
    // Find tickets with similar subject or same sender from last 7 days
    const potentialDuplicates = await Ticket.find({
      $and: [
        {
          $or: [
            { subject: ticket.subject },
            { 
              subject: { 
                $regex: ticket.subject.split(' ').slice(0, 3).join(' '), 
                $options: 'i' 
              } 
            }
          ]
        },
        { _id: { $ne: ticket._id } },
        { isMerged: { $ne: true } },
        { date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
      ]
    }).limit(5); // Limit to 5 potential duplicates to avoid too many API calls

    console.log(`📋 Found ${potentialDuplicates.length} potential duplicates for AI analysis`);
    const duplicates = [];

    for (const potentialDuplicate of potentialDuplicates) {
      // Skip if already exact match
      if (potentialDuplicate.subject === ticket.subject && 
          potentialDuplicate.from === ticket.from && 
          potentialDuplicate.body === ticket.body) {
        continue;
      }

      const similarity = await this.checkContentSimilarity(ticket, potentialDuplicate);
      
      if (similarity.similar && similarity.confidence >= 70) {
        duplicates.push({
          ticket: potentialDuplicate,
          confidence: similarity.confidence,
          reason: similarity.reason
        });
      }
    }

    return duplicates;
  }

  
  /**
   * Main duplicate detection method
   */
  static async detectDuplicates(ticket) {
    console.log(`🚀 Starting duplicate detection for ticket: ${ticket.subject} (ID: ${ticket._id})`);
    
    // First check for exact duplicates
    const exactResult = await this.checkExactDuplicate(ticket);
    
    if (exactResult.isDuplicate) {
      console.log(`✅ Exact duplicate detected with confidence: ${exactResult.confidence}%`);
      return exactResult;
    }

    // If no exact match, check for AI-detected duplicates
    const aiDuplicates = await this.checkAIDuplicates(ticket);
    
    if (aiDuplicates.length > 0) {
      // Return the highest confidence match
      const bestMatch = aiDuplicates.reduce((prev, current) => 
        (prev.confidence > current.confidence) ? prev : current
      );

      console.log(`✅ AI duplicate detected with confidence: ${bestMatch.confidence}%`);
      return {
        isDuplicate: true,
        confidence: bestMatch.confidence,
        type: 'ai_detected',
        duplicateOf: bestMatch.ticket._id,
        reason: bestMatch.reason,
        allDuplicates: aiDuplicates // Include all duplicates found
      };
    }

    console.log(`❌ No duplicates found for ticket: ${ticket.subject}`);
    return { isDuplicate: false, confidence: 0, type: 'none' };
  }

  /**
   * Get all duplicates for a ticket (including both exact and AI-detected)
   */
  static async getAllDuplicates(ticket) {
    console.log(`🔍 Getting all duplicates for ticket: ${ticket.subject} (ID: ${ticket._id})`);
    
    const allDuplicates = [];
    
    // Check for exact duplicates
    const exactResult = await this.checkExactDuplicate(ticket);
    if (exactResult.isDuplicate) {
      // Fetch the actual ticket object for the exact duplicate
      const exactDuplicateTicket = await Ticket.findById(exactResult.duplicateOf);
      if (exactDuplicateTicket) {
        allDuplicates.push({
          ticket: exactDuplicateTicket,
          confidence: exactResult.confidence,
          type: 'exact',
          reason: exactResult.reason
        });
      }
      
      // Also add the current ticket to the list since it's part of the duplicate group
      allDuplicates.push({
        ticket: ticket,
        confidence: exactResult.confidence,
        type: 'exact',
        reason: 'Current ticket (exact duplicate)'
      });
    }

    // Check for AI-detected duplicates
    const aiDuplicates = await this.checkAIDuplicates(ticket);
    allDuplicates.push(...aiDuplicates);

    // Also check if this ticket is a duplicate of others (bidirectional detection)
    const ticketsThatDuplicateThis = await Ticket.find({
      duplicateOf: ticket._id,
      isMerged: { $ne: true }
    });

    for (const duplicateTicket of ticketsThatDuplicateThis) {
      allDuplicates.push({
        ticket: duplicateTicket,
        confidence: duplicateTicket.duplicateConfidence || 0,
        type: duplicateTicket.duplicateType || 'unknown',
        reason: duplicateTicket.duplicateReason || 'Duplicate of this ticket'
      });
    }

    // Check for tickets with the same subject and sender (potential duplicates)
    const sameSubjectSender = await Ticket.find({
      subject: ticket.subject,
      from: ticket.from,
      _id: { $ne: ticket._id },
      isMerged: { $ne: true },
      date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    });

    for (const potentialDuplicate of sameSubjectSender) {
      // Skip if already in the list
      if (allDuplicates.some(dup => dup.ticket._id.toString() === potentialDuplicate._id.toString())) {
        continue;
      }
      
      allDuplicates.push({
        ticket: potentialDuplicate,
        confidence: 85, // High confidence for same subject + sender
        type: 'subject_sender_match',
        reason: 'Same subject and sender'
      });
    }

    // If we found duplicates but the current ticket isn't in the list, add it
    // This ensures users can select both tickets for merging
    if (allDuplicates.length > 0 && !allDuplicates.some(dup => dup.ticket._id.toString() === ticket._id.toString())) {
      allDuplicates.push({
        ticket: ticket,
        confidence: 100,
        type: 'current_ticket',
        reason: 'Current ticket (part of duplicate group)'
      });
    }

    // Remove duplicates from the list (in case a ticket appears multiple times)
    const uniqueDuplicates = [];
    const seenIds = new Set();
    
    for (const duplicate of allDuplicates) {
      if (!seenIds.has(duplicate.ticket._id.toString())) {
        seenIds.add(duplicate.ticket._id.toString());
        uniqueDuplicates.push(duplicate);
      }
    }

    console.log(`📋 Found ${uniqueDuplicates.length} total unique duplicates for ticket: ${ticket.subject}`);
    return uniqueDuplicates;
  }

  /**
   * Update ticket with duplicate information
   */
  static async updateTicketDuplicateStatus(ticketId, duplicateInfo) {
    console.log(`💾 Updating ticket ${ticketId} with duplicate status:`, {
      isDuplicate: duplicateInfo.isDuplicate,
      confidence: duplicateInfo.confidence,
      type: duplicateInfo.type,
      duplicateOf: duplicateInfo.duplicateOf,
      reason: duplicateInfo.reason
    });
    
    await Ticket.findByIdAndUpdate(ticketId, {
      isDuplicate: duplicateInfo.isDuplicate,
      duplicateConfidence: duplicateInfo.confidence,
      duplicateType: duplicateInfo.type,
      duplicateOf: duplicateInfo.duplicateOf,
      duplicateReason: duplicateInfo.reason,
      duplicateChecked: true
    });
    
    console.log(`✅ Ticket ${ticketId} duplicate status updated successfully`);
  }
}

module.exports = DuplicateDetectionService;
