import { api, showToast, formatDateTime } from '../utils.js';

export async function render(root, user) {
  root.innerHTML = `
    <h2 class="mb-4">My Bookings</h2>
    <div id="bookingsList" class="flex-column gap-2 mb-4">
      <div class="text-center text-muted mt-4">Loading bookings...</div>
    </div>
  `;

  loadBookings();
}

async function loadBookings() {
  const container = document.getElementById('bookingsList');
  try {
    const res = await api('GET', '/bookings/my');
    if (!res.data || res.data.length === 0) {
      container.innerHTML = `<div class="card p-4 text-center">You have no bookings yet. Time to <a href="/events.html" style="color:var(--neon-cyan)">find an event</a>!</div>`;
      return;
    }

    let html = '';
    res.data.forEach(b => {
      const color = b.status === 'confirmed' ? 'var(--success)' : (b.status === 'cancelled' ? 'var(--danger)' : 'var(--warning)');

      html += `
        <div class="card p-4" style="border-left: 4px solid ${color}; padding:20px;">
          <div class="d-flex justify-between align-center mb-2">
            <div>
              <div class="label" style="color:var(--text-muted)">Booking Ref</div>
              <h3 style="font-family:monospace">${b.booking_reference}</h3>
            </div>
            <div style="text-align:right">
              <span class="badge badge-glass" style="color:${color}">${b.status.toUpperCase()}</span>
              <div class="mt-1 font-weight-bold">₹${b.total_amount}</div>
            </div>
          </div>
          
          <div class="d-flex align-center gap-2 pt-2" style="border-top:1px solid var(--border)">
            <div style="width:60px; height:60px; border-radius:8px; overflow:hidden; background:var(--nebula)">
              ${b.banner_url ? `<img src="${b.banner_url}" style="width:100%;height:100%;object-fit:cover;">` : ''}
            </div>
            <div style="flex:1">
              <a href="/event-detail.html?slug=${b.slug || ''}" style="color:#fff; text-decoration:none; font-weight:600; font-size:1.1rem">${b.event_title}</a>
              <div style="color:var(--text-secondary); font-size:0.9rem">📅 ${formatDateTime(b.start_datetime)}</div>
            </div>
          </div>
          
          <div class="mt-2 d-flex justify-between align-center">
            <span style="color:var(--text-muted); font-size:0.85rem">Booked ${formatDateTime(b.created_at)}</span>
            ${b.status === 'confirmed' ? `<button class="btn-outline btn-small" onclick="window.location.hash='#tickets'">View Tickets</button>` : ''}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  } catch (e) {
    container.innerHTML = `<div class="text-danger p-4 text-center">Failed to load bookings</div>`;
  }
}
