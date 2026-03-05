import { api, showToast, formatDateTime, formatDate, startCountdown } from './utils.js';

let currentEvent = null;
let selectedTickets = {};

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');

    if (!slug) return window.location.href = '/events.html';

    try {
        const res = await api('GET', `/events/${slug}`);
        if (!res.success) throw new Error();
        currentEvent = res.data;
        renderEvent(res.data);
    } catch (e) {
        document.getElementById('pageLoader').innerText = 'Event not found.';
    }

    // Tabs logic
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById(e.target.dataset.target).classList.add('active');
        });
    });

    document.getElementById('saveEventBtn').addEventListener('click', () => {
        showToast('Requires authentication to save events', 'info');
    });
});

function renderEvent(e) {
    document.getElementById('pageLoader').style.display = 'none';
    document.getElementById('eventWrapper').style.display = 'block';

    document.title = `${e.title} - EVENTARA`;
    document.getElementById('eTitle').innerText = e.title;
    document.getElementById('eTagline').innerText = e.tagline || '';
    if (e.banner_url) document.getElementById('eBanner').src = e.banner_url;
    document.getElementById('eCategory').innerText = e.category;
    document.getElementById('eFormat').innerText = e.format;

    document.getElementById('eDate').innerText = formatDateTime(e.start_datetime);
    document.getElementById('eVenue').innerText = e.venue_city || 'Online';
    document.getElementById('eRating').innerText = e.total_reviews > 0 ? `${Number(e.avg_rating).toFixed(1)} (${e.total_reviews})` : 'New';

    document.getElementById('orgName').innerText = e.organizer_name;
    if (e.organization_name) document.getElementById('orgBio').innerText = e.organization_name;

    document.getElementById('eDesc').innerText = e.description;

    if (e.tags) {
        const tagsArr = e.tags.split(',').map(t => t.trim()).filter(Boolean);
        document.getElementById('eTags').innerHTML = tagsArr.map(t => `<span class="badge badge-glass mr-1" style="border-left:none; background:var(--glass-border); margin-right:5px; color:var(--text-secondary)">#${t}</span>`).join('');
    }

    document.getElementById('eStartFull').innerText = new Date(e.start_datetime).toLocaleString();
    document.getElementById('eEndFull').innerText = new Date(e.end_datetime).toLocaleString();

    document.getElementById('eLocationTxt').innerText = `${e.venue_name || ''}, ${e.venue_address || ''}, ${e.venue_city || ''}`;

    startCountdown(e.start_datetime, 'countdownTimer');

    renderTickets(e.ticket_types);
    renderReviews(e);
}

function renderTickets(tickets) {
    const container = document.getElementById('ticketsContainer');
    if (!tickets || tickets.length === 0) {
        container.innerHTML = '<p class="text-secondary">No tickets available at the moment.</p>';
        return;
    }

    let html = '';
    tickets.forEach(t => {
        const available = t.total_quantity - t.sold_quantity;
        const isSoldOut = available <= 0;

        selectedTickets[t.id] = { qty: 0, price: Number(t.price), max: t.max_per_booking, available, name: t.name };

        html += `
      <div class="ticket-type-card" style="border-left-color: ${t.color || 'var(--glow-purple)'}; opacity: ${isSoldOut ? 0.6 : 1}">
        <div style="flex:1">
          <h3 style="color:var(--text-primary)">${t.name} ${isSoldOut ? '<span class="text-danger" style="font-size:0.8rem; margin-left:10px;">SOLD OUT</span>' : ''}</h3>
          <p style="color:var(--text-secondary); font-size:0.9rem; margin-bottom:10px">${t.description || ''}</p>
          <div style="font-size:1.5rem; font-weight:700; color:var(--neon-cyan); font-family:Poppins">₹${t.price}</div>
          <p style="font-size:0.8rem; color:var(--text-muted); margin-top:5px;">${available} tickets left</p>
        </div>
        ${!isSoldOut ? `
          <div class="qty-controls">
            <button class="qty-btn" onclick="updateQty(${t.id}, -1)">-</button>
            <span id="qty-${t.id}" style="width:20px; text-align:center; font-weight:bold">0</span>
            <button class="qty-btn" onclick="updateQty(${t.id}, 1)">+</button>
          </div>
        ` : '<button class="btn btn-outline btn-small" disabled>Sold Out</button>'}
      </div>
    `;
    });
    container.innerHTML = html;
}

window.updateQty = (id, delta) => {
    const t = selectedTickets[id];
    let current = t.qty;
    current += delta;

    if (current < 0) current = 0;
    if (current > t.max) { showToast(`Maximum ${t.max} allowed`); current = t.max; }
    if (current > t.available) { showToast(`Only ${t.available} left`); current = t.available; }

    t.qty = current;
    document.getElementById(`qty-${id}`).innerText = current;
    updateCheckoutState();
};

function updateCheckoutState() {
    const c = document.getElementById('checkoutSection');
    const forms = document.getElementById('attendeesForms');
    const gTotal = document.getElementById('grandTotal');

    let totalQty = 0;
    let totalPrice = 0;

    Object.values(selectedTickets).forEach(t => {
        totalQty += t.qty;
        totalPrice += (t.qty * t.price);
    });

    if (totalQty > 0) {
        c.style.display = 'block';

        let formsHtml = '';
        Object.keys(selectedTickets).forEach(id => {
            const t = selectedTickets[id];
            for (let i = 0; i < t.qty; i++) {
                formsHtml += `
          <div class="attendee-form">
            <div class="label" style="margin-bottom:10px; color:var(--glow-purple-light)">${t.name} - Attendee ${i + 1}</div>
            <input type="text" class="input-field mb-1" placeholder="Full Name" id="att_name_${id}_${i}" required>
            <input type="email" class="input-field" placeholder="Email Address" id="att_email_${id}_${i}" required>
          </div>
        `;
            }
        });
        forms.innerHTML = formsHtml;
        gTotal.innerText = `₹${totalPrice}`;
    } else {
        c.style.display = 'none';
    }
}

document.getElementById('bookNowBtn')?.addEventListener('click', async (e) => {
    const btn = e.target;
    btn.innerText = 'Processing...';
    btn.disabled = true;

    try {
        const userRes = await api('GET', '/auth/me');
        if (!userRes.user) throw new Error('not_logged_in');

        // Collect data
        const items = [];
        const attendees = [];

        for (const [id, t] of Object.entries(selectedTickets)) {
            if (t.qty > 0) {
                items.push({ ticket_type_id: parseInt(id), quantity: t.qty });
                for (let i = 0; i < t.qty; i++) {
                    const name = document.getElementById(`att_name_${id}_${i}`).value;
                    const email = document.getElementById(`att_email_${id}_${i}`).value;
                    if (!name || !email) throw new Error('Please fill all attendee details');
                    attendees.push({ name, email });
                }
            }
        }

        const payload = {
            event_id: currentEvent.id,
            items, attendees, payment_method: 'free'
        };

        const res = await api('POST', '/bookings', payload);
        if (res.success) {
            showToast('Booking Confirmed!', 'success');
            setTimeout(() => window.location.href = '/dashboard.html#bookings', 2000);
        }
    } catch (err) {
        if (err.message === 'not_logged_in') {
            showToast('Please log in first to book tickets', 'warning');
            setTimeout(() => window.location.href = '/login.html', 1500);
        } else {
            showToast(err.message, 'error');
        }
    }

    btn.innerText = 'Confirm Booking';
    btn.disabled = false;
});

function renderReviews(e) {
    // basic rendering, skipping detailed stars logic
    if (!e.recent_reviews || e.recent_reviews.length === 0) {
        document.getElementById('reviewsList').innerHTML = '<p class="text-secondary p-4 text-center">No reviews yet.</p>';
        return;
    }
}
