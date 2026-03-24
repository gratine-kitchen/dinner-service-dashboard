# Dinner Service Kitchen Dashboard

Small web app prototype for a restaurant kitchen dashboard.

## Features
- Displays orders grouped by booking and course
- Starter line items can be marked as sent
- Ready for future integration with Google Sheets API for live orders

## Files
- `index.html`: dashboard HTML layout
- `style.css`: styling for cards and controls
- `app.js`: JavaScript interactions and future data loading hooks

## Usage
1. Open `index.html` in a browser.
2. Click "Mark sent" for starter items to mark them completed.

## Next steps
- Hook up Google Sheets API in `loadOrdersFromSheet()`
- Add full booking/course state management and persistence
- Add filtering for pending/served items
