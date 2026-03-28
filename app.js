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
      header.appendChild(specialDiv);
    }

    // Flatten all items from all courses and sort globally by order
    const allItems = [];
    Object.entries(booking.courses || {}).forEach(([course, items]) => {
      items.forEach((item) => {
        allItems.push({ ...item, course });
      });
    });

    // Sort all items globally by order field
    allItems.sort((a, b) => {
      const aOrder = a.order;
      const bOrder = b.order;

      if (aOrder == null && bOrder == null) return 0;
      if (aOrder == null) return 1;
      if (bOrder == null) return -1;
      return aOrder - bOrder;
    });

    // Render items in globally sorted order, with course headers when course changes
    let currentCourse = null;
    let courseDiv = null;
    let list = null;

    allItems.forEach((item) => {
      // If course changed, create a new course section
      if (item.course !== currentCourse) {
        currentCourse = item.course;
        courseDiv = document.createElement('div');
        courseDiv.className = 'course';
        courseDiv.dataset.course = currentCourse;

        const title = document.createElement('h3');
        title.textContent = currentCourse.toUpperCase();
        courseDiv.appendChild(title);

        list = document.createElement('ul');
        courseDiv.appendChild(list);
        bookingSection.appendChild(courseDiv);
      }

      // Add item to the current course's list
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
      const upgradePrice = Number(item.upgradePrice);

      const nameText = document.createTextNode(item.dish);
      name.appendChild(nameText);

      if (Number.isFinite(upgradePrice) && upgradePrice > 0) {
        const formattedUpgradePrice = Number.isInteger(upgradePrice)
          ? String(upgradePrice)
          : upgradePrice.toFixed(2);

        const price = document.createElement('span');
        price.className = 'item-upgrade-price';
        if (item.complimentary || item.upgradeWaived) {
          price.classList.add('item-upgrade-price-waived');
        }
        price.textContent = ` (+$${formattedUpgradePrice})`;
        name.appendChild(price);
      }

      if (item.complimentary) {
        name.appendChild(document.createTextNode(' 🎁'));
      }
      if (item.upgradeWaived) {
        name.appendChild(document.createTextNode(' 🆓'));
      }

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
