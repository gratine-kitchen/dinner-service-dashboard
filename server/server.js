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

// Helper: Parse date string from sheet (format: M/D/YYYY or similar)
function parseSheetDate(dateStr) {
  if (!dateStr) return null;
  try {
    // Try parsing common formats: M/D/YYYY, MM/DD/YYYY, etc.
    const parts = dateStr.trim().split('/');
    if (parts.length === 3) {
      const month = parseInt(parts[0]) - 1; // JS months are 0-indexed
      const day = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      return new Date(year, month, day);
    }
  } catch (e) {
    // Fallback: try Date constructor
  }
  return null;
}

// Helper: Convert date to comparable format (YYYY-MM-DD)
function dateToString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Helper: Get today's date at midnight
function getTodayDate() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
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

/**
 * GET /api/orders/upcoming
 * Fetch only bookings for today, or the nearest future date with bookings
 */
app.get('/api/orders/upcoming', async (req, res) => {
  try {
    const bookingsData = await getSheetData('Bookings');
    const menuForBookingData = await getSheetData('MenuForBooking');
    const menuItemsData = await getSheetData('MenuItems');
    const guestsData = await getSheetData('Guests');

    const allOrders = await transformOrderData(bookingsData, menuForBookingData, menuItemsData, guestsData);

    // Parse dates and find unique dates with bookings
    const ordersByDate = {};
    const validOrders = [];

    allOrders.forEach((order) => {
      const parsedDate = parseSheetDate(order.date);
      if (parsedDate) {
        const dateStr = dateToString(parsedDate);
        if (!ordersByDate[dateStr]) {
          ordersByDate[dateStr] = [];
        }
        ordersByDate[dateStr].push(order);
        validOrders.push({ order, date: parsedDate, dateStr });
      }
    });

    // Sort by date and find today or closest future date
    const today = getTodayDate();
    const todayStr = dateToString(today);

    let selectedDate = null;
    let selectedOrders = [];

    // First try today
    if (ordersByDate[todayStr]) {
      selectedDate = todayStr;
      selectedOrders = ordersByDate[todayStr];
    } else {
      // Find closest future date
      const futureDates = Object.keys(ordersByDate)
        .map((d) => ({
          dateStr: d,
          date: new Date(d),
          orders: ordersByDate[d],
        }))
        .filter((item) => new Date(item.dateStr) >= today)
        .sort((a, b) => new Date(a.dateStr) - new Date(b.dateStr));

      if (futureDates.length > 0) {
        selectedDate = futureDates[0].dateStr;
        selectedOrders = futureDates[0].orders;
      } else {
        // No future bookings; try past (fallback to last booking)
        const pastDates = Object.keys(ordersByDate)
          .map((d) => ({
            dateStr: d,
            date: new Date(d),
            orders: ordersByDate[d],
          }))
          .sort((a, b) => new Date(b.dateStr) - new Date(a.dateStr));

        if (pastDates.length > 0) {
          selectedDate = pastDates[0].dateStr;
          selectedOrders = pastDates[0].orders;
        }
      }
    }

    res.json({
      success: true,
      data: selectedOrders,
      selectedDate: selectedDate,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching upcoming orders:', error);
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
