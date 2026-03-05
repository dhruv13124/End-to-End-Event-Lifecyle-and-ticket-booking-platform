import { api, showToast } from '../utils.js';

export async function render(root, user) {
  if (!['organizer', 'admin'].includes(user.role)) return root.innerHTML = '<div class="text-danger">Unauthorized</div>';

  root.innerHTML = `
    <div class="d-flex justify-between align-center mb-4">
      <h2>Create New Event</h2>
      <button class="btn btn-outline btn-small" onclick="window.location.hash='#events'">Back to Events</button>
    </div>

    <div class="card p-4" style="padding:30px; max-width:800px; margin:0 auto;">
      <form id="createEventForm" class="flex-column gap-2">
        <h3 style="border-bottom: 1px solid var(--border); padding-bottom:10px;">1. Basic Info</h3>
        <div class="d-flex gap-2">
          <div style="flex:1">
            <label class="label mb-1" style="display:block">Event Title</label>
            <input type="text" id="ceTitle" class="input-field" required placeholder="Galactic Music Festival">
          </div>
          <div style="flex:1">
            <label class="label mb-1" style="display:block">Category</label>
            <select id="ceCat" class="input-field" required>
              <option value="concert">Concert</option>
              <option value="conference">Conference</option>
              <option value="workshop">Workshop</option>
              <option value="festival">Festival</option>
              <option value="sports">Sports</option>
            </select>
          </div>
        </div>

        <div>
          <label class="label mb-1" style="display:block">Banner Image</label>
          <input type="file" id="ceBanner" class="input-field" accept="image/*">
        </div>

        <div>
          <label class="label mb-1" style="display:block">Description</label>
          <textarea id="ceDesc" class="input-field" rows="4" required placeholder="Tell attendees what to expect..."></textarea>
        </div>

        <h3 style="border-bottom: 1px solid var(--border); padding-bottom:10px; margin-top:20px;">2. Date & Location</h3>
        <div class="d-flex gap-2">
          <div style="flex:1">
            <label class="label mb-1" style="display:block">Start Date/Time</label>
            <input type="datetime-local" id="ceStart" class="input-field" required>
          </div>
          <div style="flex:1">
            <label class="label mb-1" style="display:block">End Date/Time</label>
            <input type="datetime-local" id="ceEnd" class="input-field" required>
          </div>
        </div>

        <div class="d-flex gap-2">
           <div style="flex:1">
            <label class="label mb-1" style="display:block">Format</label>
            <select id="ceFormat" class="input-field" onchange="document.getElementById('venNameGrp').style.display = this.value==='virtual'?'none':'block'">
              <option value="in-person">In Person</option>
              <option value="virtual">Virtual</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
          <div style="flex:1">
            <label class="label mb-1" style="display:block">City</label>
            <input type="text" id="ceCity" class="input-field" placeholder="e.g. Neo-Tokyo">
          </div>
        </div>
        
        <div id="venNameGrp">
          <label class="label mb-1" style="display:block">Venue Name & Address</label>
          <input type="text" id="ceVenue" class="input-field" placeholder="Starship Enterprise, Dock 4">
        </div>

        <button type="submit" class="btn btn-primary w-100 mt-4" id="ceBtn" style="justify-content:center; padding:15px; font-size:1.1rem">Create Event</button>
      </form>
    </div>
  `;

  document.getElementById('createEventForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('ceBtn');
    btn.innerText = 'Creating...';
    btn.disabled = true;

    try {
      const fd = new window.FormData();
      fd.append('title', document.getElementById('ceTitle')?.value || '');
      fd.append('category', document.getElementById('ceCat')?.value || '');
      fd.append('description', document.getElementById('ceDesc')?.value || '');
      const formatDateTimeForMySQL = (isoString) => {
        if (!isoString) return '';
        // Convert "2026-03-10T10:00" to "2026-03-10 10:00:00" mapping
        const dateObj = new Date(isoString);
        if (isNaN(dateObj.getTime())) return ''; // Invalid date
        return dateObj.toISOString().slice(0, 19).replace('T', ' ');
      };

      fd.append('start_datetime', formatDateTimeForMySQL(document.getElementById('ceStart')?.value));
      fd.append('end_datetime', formatDateTimeForMySQL(document.getElementById('ceEnd')?.value));
      fd.append('format', document.getElementById('ceFormat')?.value || '');
      fd.append('venue_city', document.getElementById('ceCity')?.value || '');
      fd.append('venue_name', document.getElementById('ceVenue')?.value || '');

      const fileInput = document.getElementById('ceBanner');
      if (fileInput && fileInput.files && fileInput.files[0]) {
        fd.append('banner', fileInput.files[0]);
      }

      const res = await api('POST', '/events', fd, true); // true for FormData
      if (res.success) {
        showToast('Event created! Now add tickets.');
        // Redirect to detail edit or just back to events
        window.location.hash = '#events';
      }
    } catch (err) {
      console.error("Create Event Form Error:", err);
      showToast(err.message || 'Failed to create event', 'error');
      btn.innerText = 'Create Event';
      btn.disabled = false;
    }
  });
}
