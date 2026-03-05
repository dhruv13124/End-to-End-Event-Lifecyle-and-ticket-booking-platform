import { api, showToast } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
    // If already logged in, redirect to dashboard
    try {
        const res = await api('GET', '/auth/me');
        if (res.success && res.user) {
            window.location.href = '/dashboard.html';
            return;
        }
    } catch (e) { /* not logged in */ }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const btn = document.getElementById('loginBtn');
            btn.innerText = 'Signing In...';
            btn.disabled = true;

            try {
                const res = await api('POST', '/auth/login', { email, password });
                if (res.success) {
                    showToast('Login successful. Redirecting...', 'success');
                    setTimeout(() => window.location.href = '/dashboard.html', 1000);
                }
            } catch (err) {
                showToast(err.message, 'error');
                btn.innerText = 'Sign In to Dashboard';
                btn.disabled = false;
            }
        });
    }

    const roleToggle = document.getElementById('roleToggle');
    let selectedRole = 'attendee';
    if (roleToggle) {
        const intent = localStorage.getItem('roleIntent');
        if (intent === 'organizer') {
            selectedRole = 'organizer';
            document.querySelector('[data-role="attendee"]').classList.remove('active');
            document.querySelector('[data-role="organizer"]').classList.add('active');
            document.getElementById('orgNameGroup').style.display = 'block';
            localStorage.removeItem('roleIntent');
        }

        roleToggle.addEventListener('click', (e) => {
            if (e.target.classList.contains('role-btn')) {
                document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                selectedRole = e.target.dataset.role;
                document.getElementById('orgNameGroup').style.display = selectedRole === 'organizer' ? 'block' : 'none';
            }
        });
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fn = document.getElementById('regName').value;
            const email = document.getElementById('regEmail').value;
            const pw1 = document.getElementById('regPassword').value;
            const pw2 = document.getElementById('regConfirm').value;
            const org = document.getElementById('regOrg').value;

            if (pw1 !== pw2) {
                return showToast('Passwords do not match', 'error');
            }
            if (pw1.length < 8) {
                return showToast('Password must be at least 8 characters', 'error');
            }

            const btn = document.getElementById('regBtn');
            btn.innerText = 'Creating Account...';
            btn.disabled = true;

            try {
                const payload = { full_name: fn, email, password: pw1, role: selectedRole };
                if (selectedRole === 'organizer') payload.organization_name = org;

                const res = await api('POST', '/auth/register', payload);
                if (res.success) {
                    showToast('Account created! 🎉 Redirecting...', 'success');
                    setTimeout(() => window.location.href = '/login.html', 1500);
                }
            } catch (err) {
                showToast(err.message, 'error');
                btn.innerText = 'Create Account';
                btn.disabled = false;
            }
        });
    }
});
