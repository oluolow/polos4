# CashFlow Pro - Project TODO

## Database & Backend
- [x] Design and implement database schema for all data types
- [x] Create database query helpers in server/db.ts
- [x] Implement tRPC procedures for daily entries (CRUD)
- [x] Implement tRPC procedures for recurring expenses (CRUD)
- [x] Implement tRPC procedures for imported transactions (CRUD)
- [x] Implement tRPC procedures for todo items (CRUD)
- [x] Implement tRPC procedures for calendar items (CRUD)
- [x] Add user-scoped queries to ensure data isolation

## Frontend Integration
- [x] Copy and integrate existing HTML/CSS/JS into React components
- [x] Replace localStorage calls with tRPC mutations/queries
- [x] Implement authentication flow with Manus OAuth
- [x] Add loading states for all data operations
- [x] Add error handling for failed operations

## Data Migration
- [x] Create migration utility to transfer localStorage to database
- [x] Add migration UI/prompt for first-time users
- [x] Test migration with sample localStorage data

## Testing & Deployment
- [x] Write vitest tests for backend procedures
- [x] Test cross-device data sync
- [x] Test user data isolation
- [x] Create final checkpoint for deployment

## Button Functionality Issues
- [x] Implement Import CSV button handler
- [x] Implement Review Expenses button handler
- [x] Implement Analysis button handler
- [x] Implement Export button handler
- [x] Implement Add Expense button handler
- [ ] Make table cells editable for data entry
- [ ] Add inline editing for daily entries

## CSV Import Feature
- [x] Create CSV file upload dialog with file input
- [x] Implement CSV parsing logic to handle different bank formats
- [x] Build transaction preview table before import
- [x] Add column mapping interface for flexible CSV formats
- [x] Implement import to database functionality
- [x] Add success/error feedback for import process

## Missing Features from Original App
- [x] Add calendar view showing daily entries in calendar format
- [x] Implement todo list with add/complete/delete functionality
- [x] Add notes section for each day
- [ ] Implement inline editing for table cells
- [x] Add visual indicators for income/expense days on calendar

## Layout and Transaction Issues
- [x] Fix visual layout - page looks weird
- [x] Fix transaction loading - transactions not displaying properly
- [x] Adjust sidebar layout to not overlap main content
- [x] Ensure proper responsive design

## CSV Import Calendar Population
- [x] Fix CSV import to populate daily entries table
- [x] Aggregate imported transactions by date and income source
- [x] Update calendar view to show imported data
- [x] Implement smart classifier for transaction categorization
- [x] Add internal transfer exclusion logic
- [x] Add amount sign correction based on classification
- [x] Show detailed import statistics (excluded, skipped, etc.)
