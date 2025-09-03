# Ticket List Pagination Implementation

## Overview
This document describes the implementation of pagination for the ticket list view, allowing users to navigate through large numbers of tickets efficiently with 10 records per page by default.

## Backend Changes

### 1. Updated Ticket Controller (`backend/controllers/ticketController.js`)
- **Modified `fetchTickets` function** to support pagination parameters:
  - `page`: Current page number (default: 1)
  - `limit`: Number of records per page (default: 10)
  - `skip`: Calculated offset for MongoDB queries
- **Added total count calculation** using `Ticket.countDocuments()`
- **Updated response structure** to include pagination metadata:
  ```json
  {
    "message": "Root-level tickets fetched",
    "data": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalCount": 50,
      "limit": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
  ```

### 2. API Endpoint
- **Route**: `GET /api/tickets/fetch-tickets`
- **Query Parameters**:
  - `page`: Page number (optional, default: 1)
  - `limit`: Records per page (optional, default: 10)
  - `query`: JSON string for sorting/filtering (optional)

## Frontend Changes

### 1. Updated Ticket Store (`frontend/src/store/ticketStore.js`)
- **Added pagination state**:
  ```javascript
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false
  }
  ```
- **Enhanced `fetchTickets` method** to accept pagination parameters
- **Added pagination methods**:
  - `changePage(newPage, sortOptions)`: Navigate to specific page
  - `changePageSize(newLimit, sortOptions)`: Change records per page

### 2. New Pagination Component (`frontend/src/components/Pagination.jsx`)
- **Features**:
  - Page navigation (Previous/Next buttons)
  - Page number display with smart truncation
  - Page size selector (10, 25, 50, 100 records)
  - Current page indicator
  - Results counter (e.g., "Showing 1 to 10 of 50 results")
- **Styling**: Modern design with Tailwind CSS and Heroicons

### 3. Updated ViewsContent Component (`frontend/src/components/ViewsContent.jsx`)
- **Integrated pagination** at the bottom of the ticket list
- **Added pagination handlers** for page changes and size changes
- **Maintained ticket selection state** across pagination
- **Responsive layout** with scrollable ticket list and fixed pagination

### 4. Updated Sidebar (`frontend/src/components/Sidebar.jsx`)
- **Dynamic count display** using total count from pagination data
- **Fallback handling** for backward compatibility

## Features

### 1. Pagination Controls
- **Page Navigation**: Previous/Next buttons with proper disabled states
- **Page Numbers**: Smart display of page numbers (shows up to 5 pages around current)
- **Page Size Selection**: Choose between 10, 25, 50, or 100 records per page
- **Results Counter**: Clear indication of current view range

### 2. User Experience
- **Maintains State**: Ticket selections are preserved when changing pages
- **Responsive Design**: Works on different screen sizes
- **Loading States**: Proper loading indicators during page transitions
- **Error Handling**: Graceful fallbacks for API failures

### 3. Performance
- **Efficient Queries**: Uses MongoDB `skip()` and `limit()` for optimal performance
- **Smart Loading**: Only fetches required records for current page
- **Caching**: Maintains ticket data in Zustand store

## Usage Examples

### Backend API Calls
```javascript
// Get first page with 10 records
GET /api/tickets/fetch-tickets?page=1&limit=10

// Get second page with 25 records
GET /api/tickets/fetch-tickets?page=2&limit=25

// With sorting and pagination
GET /api/tickets/fetch-tickets?page=1&limit=10&query={"sort":{"date":-1}}
```

### Frontend Store Usage
```javascript
import useTicketStore from '../store/ticketStore';

const { fetchTickets, changePage, changePageSize, pagination } = useTicketStore();

// Fetch first page
await fetchTickets(null, 1, 10);

// Change to page 3
await changePage(3);

// Change page size to 25
await changePageSize(25);
```

## Backward Compatibility
- **Default Behavior**: If no pagination parameters are provided, defaults to page 1 with 10 records
- **API Response**: Maintains existing response structure while adding pagination metadata
- **Frontend Fallbacks**: Gracefully handles cases where pagination data might not be available

## Testing
A test script (`backend/test-pagination.js`) is provided to verify pagination functionality:
- Tests different page numbers and limits
- Verifies pagination metadata
- Tests sorting with pagination
- Validates API response structure

## Future Enhancements
- **URL State**: Add pagination state to URL for bookmarking and sharing
- **Infinite Scroll**: Alternative to pagination for mobile devices
- **Advanced Filtering**: Combine pagination with complex search filters
- **Performance Metrics**: Track pagination performance and optimize accordingly

## Files Modified
1. `backend/controllers/ticketController.js` - Added pagination logic
2. `frontend/src/store/ticketStore.js` - Added pagination state and methods
3. `frontend/src/components/Pagination.jsx` - New pagination component
4. `frontend/src/components/ViewsContent.jsx` - Integrated pagination
5. `frontend/src/components/Sidebar.jsx` - Updated count display
6. `backend/test-pagination.js` - Test script for verification

## Dependencies
- **Backend**: No new dependencies required
- **Frontend**: Uses existing `@heroicons/react` package for icons
- **Database**: Leverages MongoDB's built-in pagination capabilities
