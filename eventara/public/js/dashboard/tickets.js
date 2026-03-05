import { api, showToast, formatDateTime } from '../utils.js';

export async function render(root, user) {
  root.innerHTML = `
    <h2 class="mb-4">My Tickets</h2>
    <div id="ticketsGrid" class="stats-grid" style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));">
      <div class="text-center text-muted mt-4" style="grid-column: 1/-1">Loading tickets...</div>
    </div>
  `;

  loadTickets();
}

async function loadTickets() {
  const container = document.getElementById('ticketsGrid');
  try {
    const res = await api('GET', '/tickets/my');
    if (!res.data || res.data.length === 0) {
      container.innerHTML = `<div class="card p-4 text-center" style="grid-column: 1/-1">You have no tickets. Get out there!</div>`;
      return;
    }

    let html = '';
    res.data.forEach(t => {
      const isUsed = t.status === 'used';
      const opacity = isUsed ? '0.6' : '1';
      const c = t.color || 'var(--glow-purple)';

      html += `
        <div class="card" style="padding:0; overflow:hidden; opacity:${opacity}">
          <div style="background: linear-gradient(45deg, ${c}, var(--space)); padding: 20px; text-align:center; border-bottom: 2px dashed rgba(255,255,255,0.2)">
            <h3 style="color:#fff; text-transform:uppercase">${t.ticket_type_name}</h3>
            <p style="color:rgba(255,255,255,0.7); font-size:0.9rem">${t.event_title}</p>
          </div>
          <div style="padding:20px; background:var(--void)">
            <div class="d-flex justify-between mb-1">
              <span class="text-muted" style="font-size:0.8rem">ATTENDEE</span>
              <span style="font-weight:600">${t.attendee_name}</span>
            </div>
            <div class="d-flex justify-between mb-1">
              <span class="text-muted" style="font-size:0.8rem">DATE</span>
              <span style="font-weight:600; font-size:0.9rem">${formatDateTime(t.start_datetime)}</span>
            </div>
            <div class="d-flex justify-between mb-2">
              <span class="text-muted" style="font-size:0.8rem">CODE</span>
              <span style="font-weight:600; font-family:monospace; color:var(--neon-cyan)">${t.ticket_code}</span>
            </div>
            
            <div class="d-flex gap-1">
              ${isUsed ?
          `<button class="btn btn-outline w-100" disabled style="color:var(--danger); border-color:var(--danger)">Ticket Used</button>` :
          `<button class="btn btn-primary w-100" onclick="dlTicket('${t.ticket_code}')" style="justify-content:center">⬇️ Download PDF</button>`
        }
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  } catch (e) {
    container.innerHTML = `<div class="text-danger p-4 text-center" style="grid-column:1/-1">Failed to load tickets</div>`;
  }
}

window.dlTicket = async (code) => {
  try {
    const blob = await api('GET', `/tickets/${code}/download`);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EVENTARA_TICKET_${code}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    showToast('Download started');
  } catch (e) {
    showToast(e.message, 'error');
  }
}
