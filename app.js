// app.js
// Sample kitchen dashboard script.
// TODO: load real orders from Google Sheets API.

const dashboard = document.getElementById('dashboard');

function markStarterSent(event) {
  const button = event.target;
  if (!button.classList.contains('sent')) return;

  const listItem = button.closest('li');
  if (!listItem) return;

  listItem.classList.add('completed');
  button.textContent = 'Sent';
  button.disabled = true;
}

// Event delegation for booking/course actions
dashboard.addEventListener('click', (event) => {
  if (event.target.matches('button.sent')) {
    markStarterSent(event);
  }
});

// Future function placeholders:
async function loadOrdersFromSheet() {
  // Fetch sheet data from Google Sheets API and render booking/course sections
}

function renderOrders(orders) {
  // Convert orders into DOM and append to #dashboard
}
