require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { getSheetData, initializeAuth } = require('./sheetsClient');
const { transformOrderData } = require('./dataTransformer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

try {
  initializeAuth();
  console.log('Google Sheets auth initialized');
} catch (error) {
  console.error('Failed to initialize Google Sheets auth:', error.message);
}

app.get('/api/status', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/orders', async (req, res) => {
  try {
    const bookingsData = await getSheetData('Bookings');
    const menuForBookingData = await getSheetData('MenuForBooking');
    const menuItemsData = await getSheetData('MenuItems');
    const guestsData = await getSheetData('Guests');

    const orders = await transformOrderData(bookingsData, menuForBookingData, menuItemsData, guestsData);

    res.json({ success: true, data: orders, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
