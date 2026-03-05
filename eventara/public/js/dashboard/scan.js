import { api, showToast } from '../utils.js';

export async function render(root, user) {
  if (!['organizer', 'admin'].includes(user.role)) return root.innerHTML = '<div class="text-danger">Unauthorized</div>';

  root.innerHTML = `
    <h2 class="mb-4">Ticket Scanner</h2>
    <div class="card p-4 text-center" style="max-width:500px; margin:0 auto; padding:40px;">
      <div style="width:100px; height:100px; background:var(--glow-purple-faint); color:var(--glow-purple); font-size:3rem; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px auto;">
        📱
      </div>
      <h3>Scan QR Code</h3>
      <p class="text-secondary mb-4">You can manually enter the ticket code below to check-in an attendee.</p>
      
      <form id="checkinForm" class="d-flex gap-1">
        <input type="text" id="scanInput" class="input-field" placeholder="TKT-XXXX-XXXX" required style="text-transform:uppercase" autocomplete="off">
        <button type="submit" class="btn btn-primary" id="ciBtn">Check-In</button>
      </form>

      <div id="scanResult" class="mt-4" style="display:none; text-align:left; padding:20px; border-radius:12px; border-left:4px solid transparent">
        <h3 id="srTitle" class="mb-1"></h3>
        <p id="srMsg"></p>
      </div>
    </div>
  `;

  document.getElementById('checkinForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('scanInput').value.trim();
    if (!code) return;

    const btn = document.getElementById('ciBtn');
    btn.innerText = 'Processing...';
    btn.disabled = true;

    const sr = document.getElementById('scanResult');
    sr.style.display = 'none';

    try {
      const res = await api('POST', `/tickets/${code}/checkin`);
      sr.style.display = 'block';
      sr.style.borderColor = 'var(--success)';
      sr.style.background = 'rgba(16,185,129,0.1)';
      document.getElementById('srTitle').innerText = '✅ Check-in Successful';
      document.getElementById('srTitle').style.color = 'var(--success)';
      document.getElementById('srMsg').innerHTML = `
        <strong>${res.attendee_name}</strong> - ${res.ticket_type}<br>
        <span class="text-muted" style="font-size:0.85rem">${res.event_title}</span>
      `;
      document.getElementById('scanInput').value = '';
    } catch (err) {
      sr.style.display = 'block';
      sr.style.borderColor = 'var(--danger)';
      sr.style.background = 'rgba(239,68,68,0.1)';
      document.getElementById('srTitle').innerText = '❌ Check-in Failed';
      document.getElementById('srTitle').style.color = 'var(--danger)';
      document.getElementById('srMsg').innerText = err.message;
    }

    btn.innerText = 'Check-In';
    btn.disabled = false;
    document.getElementById('scanInput').focus();
  });
}
