// app.js
// Kitchen dashboard - fetches orders from Node.js backend

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const dashboard = document.getElementById('dashboard');

async function loadOrdersFromBackend() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/orders`);
    if (!response.ok) throw new Error('Failed to fetch orders');
    
    const result = await response.json();
    if (result.success) {
      renderOrders(result.data);
    } else {
      console.error('API error:', result.error);
      showError('Failed to load orders from server');
    }
  } catch (error) {
    console.error('Error loading orders:', error);
    showError('Unable to connect to the kitchen dashboard server');
  }
}

function renderOrders(orders) {
  dashboard.innerHTML = ''; // Clear existing content
  
  orders.forEach(booking => {
    const bookingSection = document.createElement('section');
    bookingSection.className = 'booking';
    bookingSection.dataset.booking = booking.bookingId;
    
    // Booking header with guest info
    const header = document.createElement('div');
    header.className = 'booking-header';
    header.innerHTML = `
      <h2>${booking.guestName} - Booking ${booking.bookingId}</h2>
      <p><strong>Time:</strong> ${booking.time} | <strong>Guests:</strong> ${booking.numGuests}</p>
      ${booking.remarks ? `<p><strong>Remarks:</strong> ${booking.remarks}</p>` : ''}
      ${booking.specialRequest ? `<p><strong>Special Request:</strong> ${booking.specialRequest}</p>` : ''}
    `;
    bookingSection.appendChild(header);
    
    // Courses
    Object.entries(booking.courses).forEach(([course, items]) => {
      const courseDiv = document.createElement('div');
      courseDiv.className = 'course';
      courseDiv.dataset.course = course;
      
      const courseTitle = document.createElement('h3');
      courseTitle.textContent = course;
      courseDiv.appendChild(courseTitle);
      
      const list = document.createElement('ul');
      items.forEach((item, idx) => {
        const li = document.createElement('li');
        li.className = item.sent ? 'completed' : '';
        
        const itemSpan = document.createElement('span');
        itemSpan.textContent = `${item.dish} x${item.qty}`;
        li.appendChild(itemSpan);
        
        if (item.remarks) {
          const remarksSpan = document.createElement('span');
          remarksSpan.className = 'remarks';
          remarksSpan.textContent = `(${item.remarks})`;
          li.appendChild(remarksSpan);
        }
        
        if (course === 'Starter') {
          const button = document.createElement('button');
          button.className = 'sent';
          button.textContent = item.sent ? 'Sent' : 'Mark sent';
          button.disabled = item.sent;
          button.dataset.orderId = `${booking.bookingId}-${idx}`;
          li.appendChild(button);
        }
        
        list.appendChild(li);
      });
      courseDiv.appendChild(list);
      bookingSection.appendChild(courseDiv);
    });
    
    dashboard.appendChild(bookingSection);
  });
}

function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  dashboard.innerHTML = '';
  dashboard.appendChild(errorDiv);
}

function markStarterSent(event) {
  const button = event.target;
  if (!button.classList.contains('sent')) return;

  const listItem = button.closest('li');
  if (!listItem) return;

  listItem.classList.add('completed');
  button.textContent = 'Sent';
  button.disabled = true;
  // TODO: persist state to backend
}

// Event delegation
dashboard.addEventListener('click', (event) => {
  if (event.target.matches('button.sent')) {
    markStarterSent(event);
  }
});

// Load orders on page load
document.addEventListener('DOMContentLoaded', () => {
  loadOrdersFromBackend();
});
