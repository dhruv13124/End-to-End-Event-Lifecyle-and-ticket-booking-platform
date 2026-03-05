import { api } from '../utils.js';

export async function render(root, user) {
  // A generic overview that changes based on role
  let statsHtml = '';

  try {
    const route = user.role === 'admin' ? '/analytics/admin' :
      user.role === 'organizer' ? '/analytics/organizer' :
        '/analytics/attendee';
    const res = await api('GET', route);
    if (res.success) {
      if (user.role === 'attendee') {
        statsHtml = `
          <div class="stats-grid mt-2 mb-4" style="grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));">
            <div class="card stat-card-dash">
              <h4>Total Bookings</h4>
              <div class="value">${res.data.total_bookings}</div>
            </div>
            <div class="card stat-card-dash">
              <h4>Tickets Bought</h4>
              <div class="value">${res.data.total_tickets}</div>
            </div>
          </div>
        `;
      } else if (user.role === 'organizer' || user.role === 'admin') {
        statsHtml = `
          <div class="stats-grid mt-2 mb-4" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
            <div class="card stat-card-dash" style="border-bottom: 4px solid var(--glow-purple)">
              <h4>Total Revenue</h4>
              <div class="value">₹${res.data.total_revenue || 0}</div>
            </div>
            <div class="card stat-card-dash" style="border-bottom: 4px solid var(--neon-cyan)">
              <h4>Tickets Sold</h4>
              <div class="value">${res.data.total_tickets_sold || 0}</div>
            </div>
            <div class="card stat-card-dash" style="border-bottom: 4px solid var(--warning)">
              <h4>Active Events</h4>
              <div class="value">${res.data.active_events || 0}</div>
            </div>
          </div>
        `;
      }
    }
  } catch (e) {
    statsHtml = `<p class="label text-danger mb-4">Error loading stats</p>`;
  }

  root.innerHTML = `
    <h2 class="mb-1">Welcome back, ${user.full_name}! 👋</h2>
    <p class="text-secondary mb-4">Here's what's happening today.</p>

    ${statsHtml}

    <div class="d-flex gap-2" style="flex-wrap: wrap;">
      <div class="card p-4" style="flex: 2; min-width: 300px; padding: 20px;">
        <h3 class="mb-2">Recent Activity</h3>
        <p class="text-muted">Activity feed will be implemented here.</p>
      </div>
      
      <div class="card p-4" style="flex: 1; min-width: 300px; padding: 20px; background: linear-gradient(135deg, rgba(124,58,237,0.1), transparent);">
        <h3 class="mb-2">Quick Actions</h3>
        <div class="flex-column gap-1">
          ${user.role === 'organizer' ? `<a href="#events" class="btn btn-primary w-100" style="justify-content:center">Create New Event</a>` : ''}
          <a href="/events.html" class="btn btn-outline w-100" style="justify-content:center">Browse Events</a>
          <a href="#profile" class="btn btn-outline w-100" style="justify-content:center">Edit Profile</a>
        </div>
      </div>
    </div>
  `;
}
