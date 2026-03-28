// server/dataTransformer.js
// Transforms raw Google Sheets data into kitchen dashboard format

async function transformOrderData(bookingsRows, menuForBookingRows, menuItemsRows, guestsRows) {
  // Convert rows to objects
  const bookings = rowsToObjects(bookingsRows);
  const menuForBooking = rowsToObjects(menuForBookingRows);
  const menuItems = rowsToObjects(menuItemsRows);
  const guests = rowsToObjects(guestsRows);
  
  // Create lookup maps
  const guestMap = new Map(guests.map(g => [g.ItemId, g]));
  const menuItemMap = new Map(menuItems.map(m => [m.Dish, m]));
  
  // Group orders by booking and course
  const bookingOrders = {};
  
  for (const booking of bookings) {
    const guestInfo = guestMap.get(booking.PrimaryGuest) || {};
    
    bookingOrders[booking.ItemId] = {
      bookingId: booking.ItemId,
      guestName: guestInfo.GuestName || 'Unknown',
      date: booking.Date || '',
      session: booking.Session || '',
      time: booking.Time || '',
      numGuests: booking.NumGuests || 0,
      remarks: booking.Remarks || '',
      specialRequest: booking.SpecialRequest || '',
      courses: {}
    };
  }
  
  // Add menu items grouped by course
  for (const order of menuForBooking) {
    if (!bookingOrders[order.Booking]) {
      continue; // Skip if booking not found
    }
    
    const dish = order.Dish;
    const courseInfo = menuItemMap.get(dish);
    const course = courseInfo?.Category || 'Other';
    
    if (!bookingOrders[order.Booking].courses[course]) {
      bookingOrders[order.Booking].courses[course] = [];
    }
    
    bookingOrders[order.Booking].courses[course].push({
      dish: dish,
      qty: order.Qty || 1,
      order: parseOrderValue(order.Order),
      remarks: order.Remarks || '',
      sent: order.Status === 'Sent' || false
    });
  }

  // Sort dishes by MenuForBooking.Order (ascending) within each course
  Object.values(bookingOrders).forEach((booking) => {
    Object.values(booking.courses).forEach((items) => {
      items.sort((a, b) => {
        const aOrder = a.order;
        const bOrder = b.order;

        if (aOrder == null && bOrder == null) return 0;
        if (aOrder == null) return 1;
        if (bOrder == null) return -1;
        return aOrder - bOrder;
      });
    });
  });
  
  return Object.values(bookingOrders);
}

function parseOrderValue(rawOrder) {
  if (rawOrder === '' || rawOrder == null) return null;
  const parsed = Number(rawOrder);
  return Number.isFinite(parsed) ? parsed : null;
}

function rowsToObjects(rows) {
  if (!rows || rows.length < 2) return [];
  
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx] || '';
    });
    return obj;
  });
}

module.exports = {
  transformOrderData
};
