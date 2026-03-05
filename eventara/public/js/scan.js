import { api } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('verifyForm');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('tCode').value.trim();
        if (!code) return;

        const btn = document.getElementById('vBtn');
        btn.innerText = 'Checking...';
        btn.disabled = true;

        document.getElementById('rCard').style.display = 'none';

        try {
            const res = await api('GET', `/tickets/verify/${code}`);
            showResult(res, code);
        } catch (err) {
            showResult({ valid: false, message: err.message || 'Verification Error' }, code);
        }

        btn.innerText = 'Verify';
        btn.disabled = false;
    });
});

function showResult(res, code) {
    const card = document.getElementById('rCard');
    const dTitle = document.getElementById('rTitle');
    const dMsg = document.getElementById('rMsg');
    const dDetails = document.getElementById('rDetails');

    card.style.display = 'block';
    card.className = `card result-card ${res.valid ? 'result-success' : 'result-error'}`;

    if (res.valid) {
        dTitle.innerText = '✅ VALID TICKET';
        dTitle.style.color = 'var(--success)';
        dMsg.innerText = `Ticket Code: ${code}`;

        if (res.data) {
            dDetails.style.display = 'block';
            document.getElementById('rEvent').innerText = res.data.event_title;
            document.getElementById('rName').innerText = res.data.attendee_name;
            document.getElementById('rType').innerText = res.data.ticket_type_name;
        } else {
            dDetails.style.display = 'none';
        }
    } else {
        dTitle.innerText = '❌ INVALID TICKET';
        dTitle.style.color = 'var(--danger)';
        dMsg.innerText = res.message || 'Ticket not recognised.';
        dDetails.style.display = 'none';
    }
}
