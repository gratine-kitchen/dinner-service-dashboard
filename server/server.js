// server/server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { getSheetData, initializeAuth } = require('./sheetsClient');
const { transformOrderData } = require('./dataTransformer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files from root directory

// Initialize Google Sheets Auth
try {
  initializeAuth();
  console.log('Google Sheets auth initialized');
} catch (error) {
  console.error('Failed to initialize Google Sheets auth:', error.message);
}

// Routes

/**
 * GET /api/orders
 * Fetches all kitchen orders from Google Sheets and returns them grouped by booking/course
 */
app.get('/api/orders', async (req, res) => {
  try {
    // Fetch data from all relevant sheets
    const bookingsData = await getSheetData('Bookings');
    const menuForBookingData = await getSheetData('MenuForBooking');
    const menuItemsData = await getSheetData('MenuItems');
    const guestsData = await getSheetData('Guests');
    
    // Transform and return
    const orders = await transformOrderData(
      bookingsData,
      menuForBookingData,
      menuItemsData,
      guestsData
    );
    
    res.json({
      success: true,
      data: orders,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/status
 * Health check endpoint
 */
app.get('/api/status', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Kitchen dashboard backend running on http://localhost:${PORT}`);
  console.log(`API docs: /api/status (health check), /api/orders (fetch kitchen orders)`);
});
