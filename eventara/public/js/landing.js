import { api, showSkeleton, observeAndAnimate, formatDateTime, showToast } from './utils.js';

window.subscribe = () => {
    const email = document.getElementById('newsEmail').value;
    if (!email || !email.includes('@')) return showToast('Please enter a valid email', 'warning');
    showToast("Thanks! You'll hear from us soon 🚀");
    document.getElementById('newsEmail').value = '';
};

document.addEventListener('DOMContentLoaded', async () => {
    // Check auth for navbar and role-based buttons
    api('GET', '/auth/me').then(res => {
        if (res.success && res.user) {
            // Update Navbar
            const navLoginBtn = document.querySelector('.navbar .btn-outline');
            const navSignUpBtn = document.querySelector('.navbar .btn-primary');
            if (navLoginBtn) navLoginBtn.style.display = 'none';
            if (navSignUpBtn) {
                navSignUpBtn.innerText = 'Dashboard';
                navSignUpBtn.href = '/dashboard.html';
            }

            // Hide 'Host an Event' if user is purely an attendee
            if (res.user.role === 'attendee') {
                const hostBtn = document.querySelector('.hero-content .btn-outline');
                if (hostBtn) hostBtn.style.display = 'none';
            }
        }
    }).catch(() => { });

    // Update stats counts via intersection observer
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            document.querySelectorAll('.count-up').forEach(el => animateCountUp(el, parseInt(el.dataset.target)));
            observer.disconnect();
        }
    });
    const stOb = document.getElementById('statsObserver');
    if (stOb) observer.observe(stOb);

    // Load featured
    showSkeleton('featuredEvents', 3);
    try {
        const res = await api('GET', '/events/featured');
        const container = document.getElementById('featuredEvents');
        container.innerHTML = '';

        if (!res.data || res.data.length === 0) {
            container.innerHTML = `<p style="color:var(--text-muted); text-align:center; grid-column:1/-1;">No trending events right now. Check back later!</p>`;
            return;
        }

        res.data.forEach(e => {
            const price = e.min_price ? `from ₹${e.min_price}` : 'Free';
            const fallbackColor = `linear-gradient(45deg, var(--glow-purple-faint), var(--space))`;

            container.innerHTML += `
        <a href="/event-detail.html?slug=${e.slug}" class="card event-card float-hover">
          <div class="event-card-banner" style="background: ${fallbackColor}">
            ${e.banner_url ? `<img src="${e.banner_url}" alt="${e.title}">` : ''}
            <div class="event-badge">${e.category}</div>
            <div class="event-save" onclick="event.preventDefault(); showToast('Login to save events')">❤️</div>
          </div>
          <div class="event-info">
            <h3 class="event-title">${e.title}</h3>
            <div class="event-meta">📅 ${formatDateTime(e.start_datetime)}</div>
            <div class="event-meta">📍 ${e.venue_city || 'Online'}</div>
            <div class="event-footer mt-1">
              <span class="event-price">${price}</span>
              <span style="font-size:0.85rem; color:var(--text-secondary)">${e.organizer_name}</span>
            </div>
          </div>
        </a>
      `;
        });
    } catch (e) {
        document.getElementById('featuredEvents').innerHTML = `<p style="color:var(--danger)">Failed to load events. Is the server running?</p>`;
    }
});

function animateCountUp(element, target, duration = 1500) {
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
            start = target;
            clearInterval(timer);
        }
        // Format compact (e.g. 50K+)
        let formatted = Math.floor(start);
        if (formatted >= 1000000) formatted = (formatted / 1000000).toFixed(1) + 'M+';
        else if (formatted >= 1000) formatted = Math.floor(formatted / 1000) + 'K+';
        element.innerText = formatted;
    }, 16);
}
