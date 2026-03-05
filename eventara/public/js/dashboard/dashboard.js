import { api, showToast } from '../utils.js';

let currentUser = null;

const routes = {
    '#overview': { title: 'Overview', load: () => loadModule('overview') },
    '#profile': { title: 'My Profile', load: () => loadModule('profile') },
    '#events': { title: 'My Events', roles: ['organizer', 'admin'], load: () => loadModule('events') },
    '#events-create': { title: 'Create Event', roles: ['organizer', 'admin'], load: () => loadModule('events-create') },
    '#bookings': { title: 'My Bookings', load: () => loadModule('bookings') },
    '#tickets': { title: 'My Tickets', load: () => loadModule('tickets') },
    '#analytics': { title: 'Analytics', roles: ['organizer', 'admin'], load: () => loadModule('analytics') },
    '#scan': { title: 'Scan Tickets', roles: ['organizer', 'admin'], load: () => loadModule('scan') },
    '#admin': { title: 'Admin Controls', roles: ['admin'], load: () => loadModule('admin') },
};

document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check
    try {
        const res = await api('GET', '/auth/me');
        if (!res.user) throw new Error();
        currentUser = res.user;
        initDashboard();
    } catch (e) {
        window.location.href = '/login.html';
    }

    // Sidebar Toggles
    const sOpen = document.getElementById('openSidebar');
    const sClose = document.getElementById('closeSidebar');
    const sBar = document.getElementById('sidebar');
    if (sOpen) sOpen.addEventListener('click', () => sBar.classList.add('open'));
    if (sClose) sClose.addEventListener('click', () => sBar.classList.remove('open'));

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        try {
            await api('POST', '/auth/logout');
            window.location.href = '/login.html';
        } catch (e) { showToast('Logout failed', 'error'); }
    });

    // Notifications Check
    updateNotifCount();
});

function initDashboard() {
    document.getElementById('dUserName').innerText = currentUser.full_name;
    document.getElementById('dUserRole').innerText = currentUser.role;
    document.getElementById('dUserInitials').innerText = currentUser.full_name.substring(0, 2).toUpperCase();

    // Render Links
    const navLinksContainer = document.getElementById('navLinks');
    let linksHtml = '';

    const addLink = (hash, icon, label) => {
        linksHtml += `<a href="${hash}" class="nav-link nav-item" data-hash="${hash}">
      <span style="width:20px;text-align:center">${icon}</span> ${label}
    </a>`;
    }

    addLink('#overview', '📊', 'Overview');
    addLink('#profile', '👤', 'My Profile');
    addLink('#bookings', '🛒', 'My Bookings');
    addLink('#tickets', '🎫', 'My Tickets');

    if (['organizer', 'admin'].includes(currentUser.role)) {
        linksHtml += `<div style="margin: 15px 20px 5px 20px; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Organizer</div>`;
        addLink('#events', '📅', 'Manage Events');
        addLink('#scan', '📲', 'Scan Tickets');
        addLink('#analytics', '📈', 'Analytics');
    }

    if (currentUser.role === 'admin') {
        linksHtml += `<div style="margin: 15px 20px 5px 20px; font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase;">Admin</div>`;
        addLink('#admin', '⚙️', 'System Settings');
    }

    navLinksContainer.innerHTML = linksHtml;

    // Router
    window.addEventListener('hashchange', handleRoute);

    // Initial Route
    if (!window.location.hash || !routes[window.location.hash]) {
        window.location.hash = '#overview';
    } else {
        handleRoute();
    }
}

async function handleRoute() {
    const hash = window.location.hash;
    const route = routes[hash];

    if (!route) return window.location.hash = '#overview';

    if (route.roles && !route.roles.includes(currentUser.role)) {
        showToast('Unauthorized access', 'error');
        return window.location.hash = '#overview';
    }

    // Active Link State
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const activeLink = document.querySelector(`.nav-item[data-hash="${hash}"]`);
    if (activeLink) activeLink.classList.add('active');

    document.getElementById('pageTitle').innerText = route.title;

    // Close sidebar on mobile on nav
    document.getElementById('sidebar').classList.remove('open');

    await route.load();
}

async function loadModule(name) {
    const root = document.getElementById('appRoot');
    root.innerHTML = `<div class="text-center" style="margin-top:100px; color:var(--text-muted)">Loading...</div>`;

    try {
        const timestamp = Date.now();
        const module = await import(`./${name}.js?t=${timestamp}`);
        if (module.render) {
            await module.render(root, currentUser);
        }
    } catch (e) {
        console.error(e);
        root.innerHTML = `<div class="card p-4" style="text-align:center"><h3 class="text-danger">Module '${name}' is under construction</h3></div>`;
    }
}

async function updateNotifCount() {
    try {
        const res = await api('GET', '/notifications/unread-count');
        const badge = document.getElementById('unreadCount');
        if (res.count > 0) {
            badge.style.display = 'inline-block';
            badge.innerText = res.count > 9 ? '9+' : res.count;
        } else {
            badge.style.display = 'none';
        }
    } catch (e) { }
}
