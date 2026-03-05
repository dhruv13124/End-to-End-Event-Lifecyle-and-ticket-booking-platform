import { api, showToast, timeAgo } from '../utils.js';

export async function render(root, user) {
    root.innerHTML = `
    <div class="d-flex justify-between align-center mb-4">
      <h2>Notifications</h2>
      <button class="btn btn-outline btn-small" id="markAllReadBtn">Mark All as Read</button>
    </div>
    <div id="notifList" class="flex-column gap-1">
      <div class="text-center mt-4 text-muted">Loading...</div>
    </div>
  `;

    document.getElementById('markAllReadBtn').addEventListener('click', async () => {
        try {
            await api('POST', '/notifications/read-all');
            showToast('All notifications marked as read');
            loadNotifications();
        } catch (e) { showToast('Error marking read', 'error'); }
    });

    await loadNotifications();
}

async function loadNotifications() {
    const list = document.getElementById('notifList');
    try {
        const res = await api('GET', '/notifications');
        if (!res.data || res.data.length === 0) {
            list.innerHTML = `<div class="card p-4 text-center" style="padding: 40px; border-style:dashed;">☀️ You're all caught up!</div>`;
            return;
        }

        let html = '';
        res.data.forEach(n => {
            let icon = '🔔';
            let border = 'var(--border)';
            if (n.type === 'booking') { icon = '🛒'; border = 'var(--success)'; }
            if (n.type === 'checkin') { icon = '✅'; border = 'var(--neon-cyan)'; }
            if (n.type === 'system') { icon = '⚙️'; }

            html += `
        <div class="card p-4 d-flex gap-2 align-center" style="padding:15px 20px; border-left: 3px solid ${n.is_read ? 'transparent' : border}; opacity: ${n.is_read ? 0.6 : 1}">
          <div style="font-size:1.5rem">${icon}</div>
          <div style="flex:1">
            <h4 style="margin:0; font-size:1rem; color: ${n.is_read ? 'var(--text-secondary)' : '#fff'}">${n.title}</h4>
            <p style="margin:0; font-size:0.9rem; color:var(--text-secondary)">${n.message}</p>
            <span style="font-size:0.75rem; color:var(--text-muted)">${timeAgo(n.created_at)}</span>
          </div>
          ${!n.is_read ? `<button class="btn-icon" title="Mark Read" onclick="markRead(${n.id})">✔️</button>` : ''}
        </div>
      `;
        });
        list.innerHTML = html;
    } catch (e) {
        list.innerHTML = `<div class="text-danger p-4 text-center">Failed to load notifications</div>`;
    }
}

window.markRead = async (id) => {
    try {
        await api('PATCH', `/notifications/${id}/read`);
        document.getElementById('unreadCount').style.display = 'none'; // quick hack to clear badge
        const event = new HashChangeEvent("hashchange", { newURL: window.location.href, oldURL: window.location.href });
        window.dispatchEvent(event); // Re-render current module
    } catch (e) { showToast('Error', 'error'); }
};
