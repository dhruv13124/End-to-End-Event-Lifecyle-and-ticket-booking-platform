import { api, showToast } from '../utils.js';

export async function render(root, user) {
    root.innerHTML = `
    <div class="card p-4" style="max-width: 600px; padding: 30px;">
      <h3 class="mb-2">Profile Details</h3>
      
      <div class="d-flex align-center gap-2 mb-4">
        <div style="width: 80px; height: 80px; border-radius: 50%; background: var(--glow-purple); font-size: 2rem; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold;">
          ${user.full_name.substring(0, 2).toUpperCase()}
        </div>
        <div>
          <h2 style="margin: 0;">${user.full_name}</h2>
          <p class="text-secondary" style="margin: 0; text-transform: capitalize;">${user.role}</p>
        </div>
      </div>

      <form id="profileForm" class="flex-column gap-1">
        <div>
          <label class="label mb-1" style="display:block">Full Name</label>
          <input type="text" id="pFName" class="input-field" value="${user.full_name}" readonly disabled style="opacity: 0.7;">
          <small class="text-muted">Name changes require admin support.</small>
        </div>
        
        <div>
          <label class="label mb-1" style="display:block">Email Address</label>
          <input type="email" id="pEmail" class="input-field" value="${user.email}" readonly disabled style="opacity: 0.7;">
        </div>

        ${user.role === 'organizer' ? `
        <div>
          <label class="label mb-1" style="display:block">Organization Name</label>
          <input type="text" id="pOrg" class="input-field" value="${user.organization_name || ''}">
        </div>
        ` : ''}

        <hr style="border: 0; border-top: 1px solid var(--border); margin: 20px 0;">

        <div class="d-flex justify-between align-center">
          <p style="color:var(--text-secondary); font-size: 0.9rem;">Member since ${new Date(user.created_at).getFullYear()}</p>
          <button type="button" class="btn btn-outline" onclick="alert('Update Profile logic pending backend route if needed')">Update Settings</button>
        </div>
      </form>
    </div>
  `;
}
