import { api, showSkeleton, removeSkeleton, formatDateTime, showToast } from './utils.js';

let currentPage = 1;
const limit = 12;
let isListView = false;

document.addEventListener('DOMContentLoaded', () => {
    // Check auth for navbar
    api('GET', '/auth/me').then(res => {
        if (res.success && res.user) {
            document.getElementById('navLoginBtn').style.display = 'none';
            document.getElementById('navDashBtn').style.display = 'block';
        }
    }).catch(() => { });

    // Pre-fill filters from URL params
    const urlParams = new URLSearchParams(window.location.search);
    document.getElementById('fSearch').value = urlParams.get('search') || '';
    document.getElementById('fCategory').value = urlParams.get('category') || '';
    document.getElementById('fFormat').value = urlParams.get('format') || '';
    document.getElementById('fCity').value = urlParams.get('city') || '';

    if (urlParams.get('featured') === 'true') {
        window.isFeatured = true;
        document.getElementById('resultCount').innerText = '🔥 Trending Events';
    }

    // Bind Listeners
    const filters = ['fSearch', 'fCategory', 'fFormat', 'fCity', 'fSort'];
    filters.forEach(id => {
        const el = document.getElementById(id);
        el.addEventListener('change', () => { currentPage = 1; loadEvents(); });
        if (id === 'fSearch' || id === 'fCity') {
            el.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') { currentPage = 1; loadEvents(); }
            });
        }
    });

    document.getElementById('resetFilters').addEventListener('click', () => {
        filters.forEach(id => document.getElementById(id).value = '');
        currentPage = 1;
        window.isFeatured = false;
        window.history.replaceState({}, document.title, "/events.html");
        loadEvents();
    });

    // View Toggles
    const btnGrid = document.getElementById('viewGrid');
    const btnList = document.getElementById('viewList');
    const container = document.getElementById('eventsContainer');

    btnGrid.addEventListener('click', () => {
        isListView = false; btnGrid.classList.add('active'); btnList.classList.remove('active');
        container.classList.remove('list-view'); loadEvents();
    });
    btnList.addEventListener('click', () => {
        isListView = true; btnList.classList.add('active'); btnGrid.classList.remove('active');
        container.classList.add('list-view'); loadEvents();
    });

    // Initial Load
    loadEvents();
});

async function loadEvents() {
    showSkeleton('eventsContainer', limit);

    const search = document.getElementById('fSearch').value;
    const category = document.getElementById('fCategory').value;
    const format = document.getElementById('fFormat').value;
    const city = document.getElementById('fCity').value;
    const sort = document.getElementById('fSort').value;

    let query = `?page=${currentPage}&limit=${limit}&sort=${sort}`;
    if (search) query += `&search=${encodeURIComponent(search)}`;
    if (category) query += `&category=${category}`;
    if (format) query += `&format=${format}`;
    if (city) query += `&city=${encodeURIComponent(city)}`;
    if (window.isFeatured) query += `&featured=true`;

    try {
        const res = await api('GET', `/events${query}`);
        const container = document.getElementById('eventsContainer');
        container.innerHTML = '';

        if (!res.data || res.data.length === 0) {
            document.getElementById('resultCount').innerText = 'No events found in this galaxy 🚀';
            renderPagination(0, 0);
            return;
        }

        document.getElementById('resultCount').innerText = !window.isFeatured ? `Showing ${res.data.length} of ${res.meta.total} events` : '🔥 Trending Events';

        res.data.forEach(e => {
            const price = e.min_price ? `from ₹${e.min_price}` : 'Free';
            const fallbackColor = `linear-gradient(45deg, var(--glow-purple-faint), var(--space))`;

            container.innerHTML += `
        <a href="/event-detail.html?slug=${e.slug}" class="card event-card float-hover">
          <div class="event-card-banner" style="background: ${fallbackColor}">
            ${e.banner_url ? `<img src="${e.banner_url}" alt="${e.title}">` : ''}
            <div class="event-badge">${e.category}</div>
            <div class="event-save ${e.is_saved ? 'saved' : ''}" onclick="event.preventDefault(); toggleSave(${e.id}, this)">
               ${e.is_saved ? '❤️' : '🤍'}
            </div>
          </div>
          <div class="event-info">
            <h3 class="event-title">${e.title}</h3>
            <div class="event-meta">📅 ${formatDateTime(e.start_datetime)}</div>
            <div class="event-meta">📍 ${e.venue_name ? e.venue_name + ', ' : ''}${e.venue_city || 'Online'}</div>
            <div class="event-footer mt-1">
              <span class="event-price">${price}</span>
              <div style="text-align:right">
                <span style="font-size:0.85rem; color:var(--text-secondary); display:block">${e.organizer_name}</span>
                ${e.total_reviews > 0 ? `<span style="font-size:0.75rem; color:var(--warning)">★ ${Number(e.avg_rating).toFixed(1)} (${e.total_reviews})</span>` : ''}
              </div>
            </div>
          </div>
        </a>
      `;
        });

        renderPagination(res.meta.totalPages, currentPage);

    } catch (e) {
        document.getElementById('eventsContainer').innerHTML = `<p style="color:var(--danger)">Failed to load events: ${e.message}</p>`;
    }
}

window.toggleSave = async (id, el) => {
    // Requires dashboard api that user has - this is frontend UI trick for now or could call real.
    showToast('Saving events requires an account', 'info');
};

function renderPagination(total, current) {
    const c = document.getElementById('pagination');
    c.innerHTML = '';
    if (total <= 1) return;

    for (let i = 1; i <= total; i++) {
        const btn = document.createElement('button');
        btn.className = `btn ${i === current ? 'btn-primary' : 'btn-outline'} btn-small`;
        btn.style.margin = '0 5px';
        btn.innerText = i;
        btn.onclick = () => {
            currentPage = i;
            loadEvents();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        c.appendChild(btn);
    }
}
