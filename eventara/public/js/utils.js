// utils.js

// Make API calls easier
export const api = async (method, endpoint, body = null, isFormData = false) => {
    const options = {
        method,
        headers: {},
        credentials: 'include'
    };

    if (body) {
        if (isFormData) {
            options.body = body;
        } else {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }
    }

    const response = await fetch('/api' + endpoint, options);

    // if not JSON (e.g., pdf download)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/pdf')) {
        if (!response.ok) throw new Error('Download failed');
        return response.blob();
    }

    let data;
    const isJson = response.headers.get('content-type')?.includes('application/json');
    if (isJson) {
        data = await response.json();
    } else {
        const text = await response.text();
        data = { message: text || 'An unexpected error occurred' };
    }

    if (!response.ok) {
        throw new Error(data.message || 'API request failed');
    }
    return data;
};

// Toast Notifications
export const showToast = (message, type = 'success', duration = 3500) => {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = '✔';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';
    if (type === 'info') icon = 'ℹ️';

    toast.innerHTML = `<span>${icon}</span> <span style="margin-left: 8px;">${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
};

// Formatting
export const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatDateTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${dateStr} • ${timeStr}`;
};

export const formatCurrency = (amount, currency = 'INR') => {
    if (Number(amount) === 0) return 'Free';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);
};

export const timeAgo = (iso) => {
    const seconds = Math.floor((new Date() - new Date(iso)) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
};

// Modals
export const showModal = (id, title, bodyHTML, footerHTML = '') => {
    let modal = document.getElementById(id);
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = id;
    modal.className = 'modal-overlay';
    modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3 style="margin:0">${title}</h3>
        <button class="modal-close" onclick="document.getElementById('${id}').remove()">×</button>
      </div>
      <div class="modal-body">${bodyHTML}</div>
      ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
    </div>
  `;
    document.body.appendChild(modal);

    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
};

export const closeModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) modal.remove();
}

// Countdown
export const startCountdown = (targetISO, elementId) => {
    const el = document.getElementById(elementId);
    if (!el) return null;

    const targetDate = new Date(targetISO).getTime();

    const update = () => {
        const now = new Date().getTime();
        const distance = targetDate - now;

        if (distance < 0) {
            el.innerHTML = "Event Started / Complete";
            clearInterval(interval);
            return;
        }

        const d = Math.floor(distance / (1000 * 60 * 60 * 24));
        const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);

        el.innerHTML = `${d}d ${h}h ${m}m ${s}s`;
    };

    update();
    const interval = setInterval(update, 1000);
    return interval; // Return ID so it can be cleared on unmount/nav
};

// Ratings Stars
export const createStars = (rating, max = 5) => {
    let html = '';
    const num = Number(rating) || 0;
    for (let i = 1; i <= max; i++) {
        if (i <= Math.floor(num)) {
            html += '<span style="color:var(--warning)">★</span>';
        } else if (i === Math.ceil(num) && num % 1 !== 0) {
            html += '<span style="color:var(--warning)">★</span>'; // simplification for half star
        } else {
            html += '<span style="color:var(--text-muted)">☆</span>';
        }
    }
    return html;
};

// Skeleton Loading
export const showSkeleton = (container, count, type = 'card') => {
    const el = document.getElementById(container);
    if (!el) return;
    el.innerHTML = '';
    // VERY simplified inline shimmer block
    for (let i = 0; i < count; i++) {
        el.innerHTML += `<div class="card" style="height: 250px; background: rgba(255,255,255,0.02); animation: pulse 2s infinite"></div>`;
    }
};
export const removeSkeleton = (container) => {
    const el = document.getElementById(container);
    if (el) el.innerHTML = '';
};

export const slugify = (text) => text.toString().toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
