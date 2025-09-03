# Ticket Merge Functionality

## Overview

The ticket merge functionality allows support agents to combine two or more related tickets into a single ticket, maintaining a unified timeline and correspondence history.

## Key Features

### 1. **Chronological Display**
- Merged tickets are displayed in chronological order based on creation date
- The earliest ticket appears first in the timeline
- All correspondence is combined into a single unified view

### 2. **Customer Management**
- **Primary Customer**: The customer from the earliest ticket becomes the primary recipient
- **CC Customers**: All other customers from merged tickets are added to CC for future communications
- **Automatic Selection**: The system automatically determines the primary customer based on ticket creation date

### 3. **Visual Indicators**
- Merged tickets show a blue left border and background in the ticket list
- Merge indicators display the number of merged tickets
- Individual merged tickets show a "Merged" badge in the timeline

### 4. **Merge Information Banner**
- Merged tickets display an information banner showing:
  - Number of merged tickets
  - Merge reason (if provided)
  - Clear indication that it's a merged ticket

## How It Works

### Backend Implementation

#### Database Schema Updates
```javascript
// New fields added to Ticket model
mergedFrom: [{ type: Types.ObjectId, ref: 'Ticket' }], // Tickets merged into this one
mergedInto: { type: Types.ObjectId, ref: 'Ticket' }, // Ticket this was merged into
isMerged: { type: Boolean, default: false }, // Whether this ticket has been merged
mergeDate: { type: Date, default: null }, // When the merge occurred
mergeReason: { type: String, default: null }, // Reason for merge
primaryCustomer: { type: String, default: null }, // Primary customer email
ccCustomers: [{ type: String }], // Additional customers to CC
```

#### API Endpoints
- `POST /api/tickets/merge` - Merge tickets
- `GET /api/tickets/merge-suggestions/:ticketId` - Get merge suggestions

### Frontend Implementation

#### Merge Modal
- Accessible via "Merge" button in ticket header
- Shows similar tickets for merging
- Allows selection of primary ticket
- Optional reason field for merge

#### Ticket Display
- Chronological sorting of all correspondence
- Visual indicators for merged content
- CC line shows additional customers for merged tickets

## Usage Instructions

### For Support Agents

1. **Access Merge Function**
   - Open any ticket
   - Click the "Merge" button in the ticket header

2. **Select Tickets to Merge**
   - Choose tickets from the suggestions list
   - Select a minimum of 2 tickets
   - Choose one as the primary ticket

3. **Provide Merge Reason** (Optional)
   - Add a reason for the merge
   - Helps with audit trail and understanding

4. **Confirm Merge**
   - Review selections
   - Click "Merge X Tickets" to confirm

### Customer Communication

- **Primary Customer**: Receives all future communications directly
- **CC Customers**: Receive copies of all communications
- **Timeline**: All correspondence is displayed chronologically
- **Subject**: Updated to indicate merged status

## Technical Details

### Merge Process

1. **Validation**
   - Ensures at least 2 tickets selected
   - Checks that tickets aren't already merged
   - Validates primary ticket selection

2. **Customer Management**
   - Sorts tickets by creation date
   - Sets earliest customer as primary
   - Collects all other customers for CC

3. **Database Updates**
   - Updates primary ticket with merge information
   - Marks other tickets as merged
   - Maintains referential integrity

4. **Timeline Display**
   - Fetches all merged tickets
   - Sorts by date chronologically
   - Displays unified timeline

### Error Handling

- Prevents merging already merged tickets
- Validates ticket existence
- Handles database transaction failures
- Provides clear error messages

## Benefits

1. **Unified Communication**: All related correspondence in one place
2. **Chronological Order**: Easy to follow issue timeline
3. **Customer Management**: Automatic handling of multiple customers
4. **Audit Trail**: Clear merge history and reasons
5. **Visual Clarity**: Easy identification of merged tickets

## Future Enhancements

- Bulk merge operations
- Merge undo functionality
- Advanced merge suggestions
- Merge analytics and reporting
- Custom merge rules and policies
