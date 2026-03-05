import { api, showToast } from '../utils.js';

export async function render(root, user) {
    if (user.role !== 'admin') return root.innerHTML = '<div class="text-danger">Admin access required.</div>';

    root.innerHTML = `
    <h2 class="mb-4">System Administration</h2>
    
    <div class="tabs">
      <div class="tab active" data-target="admin-users">Manage Users</div>
      <div class="tab" data-target="admin-events">Manage Events</div>
    </div>

    <div id="admin-users" class="tab-content active mt-4">
      <div class="card p-4">
        <h3>User Directory</h3>
        <p class="text-muted mb-4">Stub for Admin User Data Table (Requires full users endpoint)</p>
        <div class="table-wrapper">
          <table>
            <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              <tr><td colspan="6" class="text-center">Admin endpoints would populate this</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div id="admin-events" class="tab-content mt-4">
      <div class="card p-4 text-center text-muted">
        System-wide event moderation tools would go here.
      </div>
    </div>
  `;

    // Bind simple fake tabs for admin
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById(e.target.dataset.target).classList.add('active');
        });
    });
}
