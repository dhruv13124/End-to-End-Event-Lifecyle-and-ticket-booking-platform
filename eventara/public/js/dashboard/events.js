import { api, showToast, formatDateTime } from '../utils.js';

export async function render(root, user) {
  if (user.role === 'attendee') return root.innerHTML = '<div class="text-danger">Unauthorized</div>';

  root.innerHTML = `
    <div class="d-flex justify-between align-center mb-4">
      <h2>My Events</h2>
       <button class="btn btn-primary" onclick="window.location.hash='#events-create'">+ Create New Event</button>
    </div>

    <div class="table-wrapper">
      <table id="eventsTable">
        <thead>
          <tr>
            <th>Event Details</th>
            <th>Date</th>
            <th>Status</th>
            <th>Sales</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody><tr><td colspan="5" class="text-center">Loading...</td></tr></tbody>
      </table>
    </div>
  `;

  try {
    const res = await api('GET', '/events/my-events/manage');
    const tbody = document.querySelector('#eventsTable tbody');

    if (!res.data || res.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">You haven\'t created any events yet.</td></tr>';
      return;
    }

    let html = '';
    res.data.forEach(e => {
      let bClass = e.status === 'draft' ? 'badge-glass' : (e.status === 'published' ? 'badge-glass text-success' : 'badge-glass text-danger');
      html += `
        <tr>
          <td>
            <div class="d-flex align-center gap-1">
              <div style="width:50px; height:50px; border-radius:8px; overflow:hidden; background:var(--nebula)">
                ${e.banner_url ? `<img src="${e.banner_url}" style="width:100%;height:100%;object-fit:cover;">` : ''}
              </div>
              <div>
                <a href="/event-detail.html?slug=${e.slug}" target="_blank" style="color:#fff; text-decoration:none; font-weight:600">${e.title}</a>
                <div style="font-size:0.8rem; color:var(--text-muted)">${e.ticket_types_count} Ticket Types</div>
              </div>
            </div>
          </td>
          <td>${formatDateTime(e.start_datetime)}</td>
          <td><span class="badge ${bClass}">${e.status}</span></td>
          <td>₹${e.total_revenue || 0}</td>
          <td>
            <div class="d-flex gap-1" style="flex-wrap: wrap;">
              <button class="action-btn" onclick="alert('Edit pending modal UI')">Edit</button>
              <button class="action-btn" style="color:var(--neon-cyan)" onclick="manageTickets(${e.id}, '${e.title}')">Tickets</button>
              ${e.status === 'draft' ? `<button class="action-btn text-success" onclick="pubEvent(${e.id})">Publish</button>` : ''}
              ${e.status === 'published' ? `<button class="action-btn text-danger" onclick="cancelEvent(${e.id})">Cancel</button>` : ''}
            </div>
          </td>
        </tr>
      `;
    });
    tbody.innerHTML = html;

  } catch (e) {
    document.querySelector('#eventsTable tbody').innerHTML = '<tr><td colspan="5" class="text-danger">Failed to load events</td></tr>';
  }
}

window.manageTickets = async (eventId, eventTitle) => {
  try {
    const res = await api('GET', `/events/${eventId}/ticket-types`);
    let ticketsHtml = res.data.length ? '' : '<p class="text-muted mb-2">No tickets added yet.</p>';
    res.data.forEach(t => {
      ticketsHtml += `
                <div class="card p-2 mb-1 d-flex justify-between align-center" style="border-left: 3px solid ${t.color || 'var(--glow-purple)'}">
                    <div>
                        <strong>${t.name}</strong> - ₹${t.price} <br>
                        <small class="text-muted">Total: ${t.total_quantity} | Sold: ${t.sold_quantity}</small>
                    </div>
                    <div class="d-flex gap-1">
                        <button class="action-btn text-success" onclick="editTicketType(${eventId}, ${t.id}, '${t.name.replace(/'/g, "\\'")}', ${t.price}, ${t.total_quantity})">Edit</button>
                        <button class="action-btn text-danger" onclick="deleteTicketType(${eventId}, ${t.id})">Delete</button>
                    </div>
                </div>
            `;
    });

    const modalBody = `
            ${ticketsHtml}
            <hr style="border-color:var(--border); margin:15px 0;">
            <h4 class="mb-1" id="ticketFormTitle">Add New Ticket Type</h4>
            <form id="addTicketForm" onsubmit="event.preventDefault(); saveTicketType(${eventId})">
                <input type="hidden" id="tId" value="">
                <input type="text" id="tName" class="input-field mb-1" placeholder="Ticket Name (e.g., General)" required>
                <div class="d-flex gap-1 mb-1">
                    <input type="number" id="tPrice" class="input-field" placeholder="Price (₹)" required min="0">
                    <input type="number" id="tQty" class="input-field" placeholder="Total Qty" required min="1">
                </div>
                <button type="submit" id="ticketSubmitBtn" class="btn btn-primary w-100 mt-1">+ Create Ticket</button>
                <button type="button" id="ticketCancelBtn" class="btn btn-outline w-100 mt-1" style="display:none" onclick="cancelEditTicket()">Cancel Edit</button>
            </form>
        `;
    const { showModal } = await import('../utils.js');
    showModal('manageTicketsModal', `Manage Tickets: ${eventTitle}`, modalBody);
  } catch (e) { showToast('Error fetching tickets', 'error'); }
};

window.editTicketType = (eventId, typeId, name, price, qty) => {
  document.getElementById('tId').value = typeId;
  document.getElementById('tName').value = name;
  document.getElementById('tPrice').value = price;
  document.getElementById('tQty').value = qty;
  document.getElementById('ticketFormTitle').innerText = 'Edit Ticket Type';
  document.getElementById('ticketSubmitBtn').innerText = 'Save Changes';
  document.getElementById('ticketCancelBtn').style.display = 'block';
};

window.cancelEditTicket = () => {
  document.getElementById('tId').value = '';
  document.getElementById('tName').value = '';
  document.getElementById('tPrice').value = '';
  document.getElementById('tQty').value = '';
  document.getElementById('ticketFormTitle').innerText = 'Add New Ticket Type';
  document.getElementById('ticketSubmitBtn').innerText = '+ Create Ticket';
  document.getElementById('ticketCancelBtn').style.display = 'none';
};

window.saveTicketType = async (eventId) => {
  try {
    const typeId = document.getElementById('tId').value;
    const payload = {
      name: document.getElementById('tName').value,
      price: Number(document.getElementById('tPrice').value),
      total_quantity: Number(document.getElementById('tQty').value),
      max_per_booking: 5
    };

    if (typeId) {
      await api('PUT', `/events/${eventId}/ticket-types/${typeId}`, payload);
      showToast('Ticket type updated successfully', 'success');
    } else {
      await api('POST', `/events/${eventId}/ticket-types`, payload);
      showToast('Ticket type created successfully', 'success');
    }

    document.getElementById('manageTicketsModal').remove();
    manageTickets(eventId, 'Event'); // Refresh modal
  } catch (e) {
    showToast(e.message || 'Error saving ticket', 'error');
  }
};

window.deleteTicketType = async (eventId, typeId) => {
  if (!confirm('Are you sure you want to delete this ticket type?')) return;
  try {
    await api('DELETE', `/events/${eventId}/ticket-types/${typeId}`);
    showToast('Ticket type deleted successfully', 'success');
    document.getElementById('manageTicketsModal').remove();
    manageTickets(eventId, 'Event'); // Refresh modal
  } catch (e) {
    showToast(e.message || 'Error deleting ticket', 'error');
  }
};

window.pubEvent = async (id) => {
  if (!confirm('Publish this event?')) return;
  try {
    await api('PATCH', `/events/${id}/publish`);
    showToast('Event published');
    const event = new HashChangeEvent("hashchange", { newURL: window.location.href, oldURL: window.location.href });
    window.dispatchEvent(event);
  } catch (e) { showToast(e.message, 'error'); }
};

window.cancelEvent = async (id) => {
  if (!confirm('Cancel this event? Refunds may apply.')) return;
  try {
    await api('PATCH', `/events/${id}/cancel`);
    showToast('Event cancelled');
    const event = new HashChangeEvent("hashchange", { newURL: window.location.href, oldURL: window.location.href });
    window.dispatchEvent(event);
  } catch (e) { showToast(e.message, 'error'); }
};
