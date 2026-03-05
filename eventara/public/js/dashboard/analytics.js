import { api, showToast } from '../utils.js';

export async function render(root, user) {
  if (user.role === 'attendee') {
    root.innerHTML = `<div class="card p-4 text-center"><h3>Analytics are for organizers only</h3></div>`;
    return;
  }

  root.innerHTML = `<div class="text-center mt-4">Loading Analytics...</div>`;

  try {
    const route = user.role === 'admin' ? '/analytics/admin' : '/analytics/organizer';
    const res = await api('GET', route);
    if (!res.success) throw new Error();
    const data = res.data;

    let html = `
      <div class="d-flex justify-between align-center mb-4">
        <h2>Analytics Overview</h2>
        <button class="btn btn-outline btn-small" onclick="window.print()">Export Report</button>
      </div>

      <div class="stats-grid mb-4">
        <div class="card stat-card-dash" style="border-bottom:3px solid var(--glow-purple)">
          <h4>Total Revenue</h4>
          <div class="value">₹${data.total_revenue || 0}</div>
        </div>
        <div class="card stat-card-dash" style="border-bottom:3px solid var(--neon-cyan)">
          <h4>Tickets Scanned / Sold</h4>
          <div class="value">${data.total_attendees || 0}</div>
        </div>
        <div class="card stat-card-dash" style="border-bottom:3px solid var(--warning)">
          <h4>Total Bookings</h4>
          <div class="value">${data.total_bookings || 0}</div>
        </div>
        <div class="card stat-card-dash" style="border-bottom:3px solid var(--success)">
          <h4>Total Events</h4>
          <div class="value">${data.total_events || 0}</div>
        </div>
      </div>

      <div class="card p-4 mb-4" style="padding: 20px;">
        <h3 class="mb-2">Sales Over Time (Last 30 Days)</h3>
        <div style="height: 300px; width: 100%;">
          <canvas id="salesChart"></canvas>
        </div>
      </div>
      
      <div class="events-layout" style="display:flex; gap:20px; flex-wrap:wrap;">
          <div class="card p-4" style="flex:2; min-width:300px; padding: 20px;">
            <h3 class="mb-2">Per-Event Performance</h3>
            <div class="table-wrapper">
                <table style="width:100%">
                    <thead>
                        <tr>
                            <th style="text-align:left; padding:10px; border-bottom:1px solid var(--border)">Event</th>
                            <th style="padding:10px; border-bottom:1px solid var(--border)">Revenue</th>
                            <th style="padding:10px; border-bottom:1px solid var(--border)">Attendance</th>
                            <th style="padding:10px; border-bottom:1px solid var(--border)">Rating</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.per_event_stats && data.per_event_stats.length > 0 ? data.per_event_stats.map(e => `
                            <tr>
                                <td style="padding:10px; border-bottom:1px solid var(--border)"><strong>${e.title}</strong></td>
                                <td style="text-align:center; padding:10px; border-bottom:1px solid var(--border)">₹${e.revenue || 0}</td>
                                <td style="text-align:center; padding:10px; border-bottom:1px solid var(--border)">${e.attendance_rate}% <br><small style="color:var(--text-muted)">(${e.attended_count}/${e.total_tickets})</small></td>
                                <td style="text-align:center; padding:10px; border-bottom:1px solid var(--border)">${e.avg_rating ? '★ ' + Number(e.avg_rating).toFixed(1) : 'NR'}</td>
                            </tr>
                        `).join('') : `<tr><td colspan="4" class="text-center text-muted" style="padding:20px;">No events hosted yet.</td></tr>`}
                    </tbody>
                </table>
            </div>
          </div>
          
          <div class="card p-4" style="flex:1; min-width:250px; padding: 20px;">
              <h3 class="mb-2">Ticket Tiers</h3>
              <div class="flex-column gap-1">
                  ${data.ticket_type_breakdown && data.ticket_type_breakdown.length > 0 ? data.ticket_type_breakdown.map(t => `
                      <div class="d-flex justify-between align-center" style="padding:10px; background:var(--glass); border-radius:8px;">
                          <span>${t.name}</span>
                          <span class="badge badge-glass text-success">${t.count} Sold</span>
                      </div>
                  `).join('') : `<p class="text-muted text-center" style="padding:20px">No tickets sold yet.</p>`}
              </div>
          </div>
      </div>
    `;

    root.innerHTML = html;

    // init chart
    const ctx = document.getElementById('salesChart').getContext('2d');

    const labels = [];
    const chartData = [];

    if (data.bookings_timeline && data.bookings_timeline.length > 0) {
      data.bookings_timeline.forEach(day => {
        const dateObj = new Date(day.date);
        labels.push(dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        chartData.push(Number(day.revenue));
      });
    } else {
      // Fallback flatline if no sales yet
      for (let i = 6; i >= 0; i--) {
        let d = new Date();
        d.setDate(d.getDate() - i);
        labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        chartData.push(0);
      }
    }

    new window.Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Revenue (₹)',
          data: chartData,
          borderColor: '#7c3aed',
          backgroundColor: 'rgba(124, 58, 237, 0.2)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#94a3b8' }
          },
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#94a3b8' }
          }
        }
      }
    });

  } catch (e) {
    root.innerHTML = `<div class="card p-4 text-center text-danger">Failed to load analytics data</div>`;
  }
}
