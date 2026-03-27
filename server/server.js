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

// In-memory sent flag tracking (placeholder; swap to sheet update for production)
const sentStatus = new Set();
function getSentKey(bookingId, course, itemIndex) {
  return `${bookingId}::${course}::${itemIndex}`;
}

async function fetchAndTransformOrders() {
  const bookingsData = await getSheetData('Bookings');
  const menuForBookingData = await getSheetData('MenuForBooking');
  const menuItemsData = await getSheetData('MenuItems');
  const guestsData = await getSheetData('Guests');

  let orders = await transformOrderData(
    bookingsData,
    menuForBookingData,
    menuItemsData,
    guestsData
  );

  // Apply in-memory sent overrides
  orders = orders.map((booking) => {
    const courses = Object.fromEntries(
      Object.entries(booking.courses).map(([course, items]) => [
        course,
        items.map((item, idx) => {
          const key = getSentKey(booking.bookingId, course, idx);
          if (sentStatus.has(key)) {
            return { ...item, sent: true };
          }
          return item;
        })
      ])
    );
    return { ...booking, courses };
  });

  return orders;
}

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
    const orders = await fetchAndTransformOrders();
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
app.post('/api/orders/:bookingId/courses/:course/items/:itemIndex/sent', (req, res) => {
  const { bookingId, course, itemIndex } = req.params;
  if (!bookingId || !course || itemIndex === undefined) {
    return res.status(400).json({ success: false, error: 'Missing parameters' });
  }

  const key = getSentKey(bookingId, course, itemIndex);
  sentStatus.add(key);

  return res.json({ success: true, data: { bookingId, course, itemIndex } });
});

app.get('/api/orders/upcoming', async (req, res) => {
  try {
    const orders = await fetchAndTransformOrders();

    const normalizeDate = (dateStr) => {
      const parsed = new Date(dateStr);
      if (!Number.isNaN(parsed.getTime())) {
        parsed.setHours(0, 0, 0, 0);
        return parsed;
      }

      const parts = dateStr.split('/').map((p) => Number(p));
      if (parts.length === 3) {
        const [m, d, y] = parts;
        const nd = new Date(y, m - 1, d);
        nd.setHours(0, 0, 0, 0);
        if (!Number.isNaN(nd.getTime())) return nd;
      }
      return null;
    };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const ordersWithDate = orders
      .map((order) => ({ ...order, parsedDate: normalizeDate(order.date) }))
      .filter((order) => order.parsedDate);

    const todayOrders = ordersWithDate.filter((o) => o.parsedDate.getTime() === today.getTime());
    let selectedOrders = todayOrders;
    let selectedDate = today;

    if (selectedOrders.length === 0) {
      const futureOrders = ordersWithDate.filter((o) => o.parsedDate.getTime() > today.getTime());
      if (futureOrders.length > 0) {
        const nextDate = new Date(Math.min(...futureOrders.map((o) => o.parsedDate.getTime())));
        selectedOrders = futureOrders.filter((o) => o.parsedDate.getTime() === nextDate.getTime());
        selectedDate = nextDate;
      } else {
        const fallbackDate = new Date(Math.max(...ordersWithDate.map((o) => o.parsedDate.getTime())));
        selectedOrders = ordersWithDate.filter((o) => o.parsedDate.getTime() === fallbackDate.getTime());
        selectedDate = fallbackDate;
      }
    }

    res.json({
      success: true,
      data: selectedOrders,
      selectedDate: selectedDate.toISOString().slice(0, 10),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching upcoming orders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

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
