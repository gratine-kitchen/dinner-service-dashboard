// app.js
// Detect environment and set API_BASE_URL accordingly
const API_BASE_URL = 
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'  // Development
    : 'https://dinner-service-backend-deoi.onrender.com';  // Production

const dashboard = document.getElementById('dashboard');
const headerDate = document.getElementById('header-date');

function updateHeaderDate(selectedDate) {
  if (!headerDate) return;
  headerDate.textContent = selectedDate ? formatDate(selectedDate) : 'Kitchen order management system';
}

function showLoading() {
  dashboard.innerHTML = '<div class="loading">Loading orders...</div>';
}

function showError(message) {
  dashboard.innerHTML = `<div class="error-message">${message}</div>`;
}

function formatDate(dateStr) {
  if (!dateStr) return 'Today';
  // dateStr format: YYYY-MM-DD
  const [year, month, day] = dateStr.split('-');
  const date = new Date(year, parseInt(month) - 1, day);
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

async function markItemSent(bookingId, course, itemIndex) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/orders/${bookingId}/courses/${encodeURIComponent(course)}/items/${itemIndex}/sent`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    if (result.success) {
      // Reload orders to show updated state
      await loadOrders();
    } else {
      console.error('Failed to mark item as sent:', result.error);
    }
  } catch (error) {
    console.error('Error marking item as sent:', error);
  }
}

function renderOrders(orders, selectedDate) {
  if (!orders || orders.length === 0) {
    updateHeaderDate(selectedDate);
    dashboard.innerHTML = '<p>No orders for this date.</p>';
    return;
  }

  dashboard.innerHTML = '';
  updateHeaderDate(selectedDate);

  orders.forEach((booking) => {
    const bookingSection = document.createElement('section');
    bookingSection.className = 'booking';

    // Booking header
    const header = document.createElement('div');
    header.className = 'booking-header';
    header.innerHTML = `
      <div class="booking-title-row">
        <h2>${booking.guestName}</h2>
        <span class="booking-id">#${booking.bookingId}</span>
      </div>
      <div class="meta">
        <span class="meta-item">${booking.time || 'TBD'}</span>
        <span class="meta-dot" aria-hidden="true"></span>
        <span class="meta-item">${booking.numGuests || 0} guests</span>
      </div>
    `;
    bookingSection.appendChild(header);

    // Special requests section (if any)
    const hasSpecialRequests = booking.specialRequest || booking.remarks;
    if (hasSpecialRequests) {
      const specialDiv = document.createElement('div');
      specialDiv.className = 'special-requests';
      specialDiv.innerHTML = `
        <h4>Special Requests</h4>
        <p>${booking.specialRequest || booking.remarks}</p>
      `;
      bookingSection.appendChild(specialDiv);
    }

    // Course sections
    Object.entries(booking.courses || {}).forEach(([course, items]) => {
      const courseDiv = document.createElement('div');
      courseDiv.className = 'course';
      courseDiv.dataset.course = course;

      const title = document.createElement('h3');
      title.textContent = course.toUpperCase();
      courseDiv.appendChild(title);

      const list = document.createElement('ul');
      items.forEach((item) => {
        const li = document.createElement('li');
        if (item.sent) li.classList.add('completed');

        const mainLine = document.createElement('div');
        mainLine.className = 'item-main';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'item-checkbox';
        checkbox.setAttribute('aria-label', `Mark ${item.dish} as done`);
        checkbox.addEventListener('change', () => {
          li.classList.toggle('checked-off', checkbox.checked);
        });
        mainLine.appendChild(checkbox);

        const quantity = document.createElement('span');
        quantity.className = 'item-quantity';
        quantity.textContent = `${item.qty}x`;
        mainLine.appendChild(quantity);

        const name = document.createElement('span');
        name.className = 'item-name';
        name.textContent = item.dish;
        mainLine.appendChild(name);

        if (item.sent) {
          const sentTag = document.createElement('span');
          sentTag.className = 'sent-tag';
          sentTag.textContent = 'Sent';
          mainLine.appendChild(sentTag);
        }

        li.appendChild(mainLine);

        // Notes/remarks
        if (item.remarks) {
          const notes = document.createElement('div');
          notes.className = 'item-notes';
          notes.textContent = item.remarks;
          li.appendChild(notes);
        }

        list.appendChild(li);
      });
      courseDiv.appendChild(list);
      bookingSection.appendChild(courseDiv);
    });

    dashboard.appendChild(bookingSection);
  });
}

async function loadOrders() {
  showLoading();

  try {
    const response = await fetch(`${API_BASE_URL}/api/orders/upcoming`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const payload = await response.json();
    if (!payload.success) {
      throw new Error(payload.error || 'API returned an error');
    }

    renderOrders(payload.data, payload.selectedDate);
  } catch (error) {
    console.error('Failed to load orders', error);
    showError(`Unable to load orders: ${error.message}`);
  }
}

document.addEventListener('DOMContentLoaded', loadOrders);

// Keep backend alive by pinging it every 10 minutes (only in production)
if (API_BASE_URL.includes('render.com')) {
  setInterval(() => {
    fetch(`${API_BASE_URL}/api/status`).catch(() => {
      // Silent fail - this is just a keep-alive ping
    });
  }, 10 * 60 * 1000);
}
