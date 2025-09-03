# Duplicate Detection Enhancement

## Overview
This enhancement improves the duplicate detection functionality in the merge dialog by implementing a toggle system that allows users to control when duplicate badges are displayed and switch between normal and duplicate views.

## Changes Made

### Backend Changes

#### 1. Enhanced Duplicate Detection Service (`backend/utils/duplicateDetection.js`)
- **Added `getAllDuplicates()` method**: This new method finds all duplicates for a given ticket, including:
  - Exact duplicates (same subject, sender, and content)
  - AI-detected duplicates (similar content)
  - Tickets that are duplicates of the current ticket
  - Tickets that the current ticket is a duplicate of

#### 2. Updated Ticket Controller (`backend/controllers/ticketController.js`)
- **Enhanced `checkDuplicates()` function**: Now returns all duplicates found, not just the first one
- **Added `getTicketDuplicates()` function**: New endpoint to get all duplicates for a specific ticket
- **Updated exports**: Added the new function to the module exports

#### 3. Updated Routes (`backend/routes/ticketRoutes.js`)
- **Added new route**: `GET /api/tickets/:id/duplicates` to fetch all duplicates for a specific ticket

### Frontend Changes

#### 1. Enhanced Ticket Store (`frontend/src/store/ticketStore.js`)
- **Added `getTicketDuplicates()` function**: New method to fetch duplicates for a specific ticket

#### 2. Improved Merge Tickets Modal (`frontend/src/components/MergeTicketsModal.jsx`)
- **Added state management**:
  - `showDuplicates`: Controls whether duplicate badges are displayed
  - `duplicatesChecked`: Tracks if duplicates have been checked for the current ticket
- **Added new buttons**:
  - "Check Duplicates": Triggers duplicate detection and shows duplicate view
  - "Show Normal"/"Show Duplicates": Toggle between normal and duplicate views
- **Enhanced functionality**:
  - Duplicate badges only show when `showDuplicates` is true
  - Users can toggle between normal merge suggestions and duplicate view
  - Clear visual indicators for which view is currently active

## User Experience Flow

### Initial State
1. User opens merge dialog
2. No duplicate badges are shown initially
3. Only "Check Duplicates" button is visible

### After Clicking "Check Duplicates"
1. System runs duplicate detection on the current ticket
2. Finds all related duplicates (exact and AI-detected)
3. Switches to "duplicate view" with badges showing
4. "Show Normal" button appears

### Toggle Functionality
1. **"Show Normal"**: Switches back to normal merge suggestions without duplicate badges
2. **"Show Duplicates"**: Switches to duplicate view with badges showing
3. Users can freely toggle between views

## API Endpoints

### New Endpoint
- `GET /api/tickets/:id/duplicates`
  - Returns all duplicates for a specific ticket
  - Includes both exact and AI-detected duplicates
  - Excludes merged tickets

### Enhanced Endpoint
- `POST /api/tickets/:id/check-duplicates`
  - Now returns all duplicates found, not just the first one
  - Includes `allDuplicates` array in response

## Benefits

1. **Better User Control**: Users decide when to see duplicate information
2. **Cleaner Interface**: No duplicate badges cluttering the initial view
3. **Flexible Workflow**: Easy toggle between normal and duplicate views
4. **Comprehensive Detection**: Finds all related duplicates, not just the first match
5. **Clear Visual Feedback**: Users know which view they're currently in

## Testing

A test file (`backend/test-duplicate-detection.js`) has been created to verify the duplicate detection functionality works correctly with sample tickets.

## Usage

1. Open a ticket and click "Merge"
2. Initially, no duplicate badges are shown
3. Click "Check Duplicates" to find and display all duplicates
4. Use "Show Normal"/"Show Duplicates" buttons to toggle between views
5. Select tickets to merge as usual
