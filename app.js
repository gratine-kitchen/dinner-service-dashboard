// app.js
const API_BASE_URL = 'https://dinner-service-backend-deoi.onrender.com';
const dashboard = document.getElementById('dashboard');

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

function renderOrders(orders, selectedDate) {
  if (!orders || orders.length === 0) {
    dashboard.innerHTML = '<p>No orders for this date.</p>';
    return;
  }

  dashboard.innerHTML = '';

  // Add date header
  const dateHeader = document.createElement('div');
  dateHeader.className = 'date-header';
  dateHeader.innerHTML = `<h2>Orders for ${formatDate(selectedDate)}</h2>`;
  dashboard.appendChild(dateHeader);

  orders.forEach((booking) => {
    const bookingSection = document.createElement('section');
    bookingSection.className = 'booking';

    const header = document.createElement('div');
    header.className = 'booking-header';
    header.innerHTML = `
      <h2>${booking.guestName} - Booking ${booking.bookingId}</h2>
      <p><strong>Time:</strong> ${booking.time || 'TBD'} | <strong>Guests:</strong> ${booking.numGuests || 0}</p>
      ${booking.remarks ? `<p><strong>Remarks:</strong> ${booking.remarks}</p>` : ''}
      ${booking.specialRequest ? `<p><strong>Special Request:</strong> ${booking.specialRequest}</p>` : ''}
    `;
    bookingSection.appendChild(header);

    Object.entries(booking.courses || {}).forEach(([course, items]) => {
      const courseDiv = document.createElement('div');
      courseDiv.className = 'course';
      courseDiv.dataset.course = course;

      const title = document.createElement('h3');
      title.textContent = course;
      courseDiv.appendChild(title);

      const list = document.createElement('ul');
      items.forEach((item) => {
        const li = document.createElement('li');
        if (item.sent) li.classList.add('completed');

        const itemText = document.createElement('span');
        itemText.textContent = `${item.dish} x${item.qty}`;
        li.appendChild(itemText);

        if (item.remarks) {
          const notes = document.createElement('span');
          notes.className = 'remarks';
          notes.textContent = `(${item.remarks})`;
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
