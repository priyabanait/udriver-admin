import React, { useEffect, useState } from 'react';
import { Shield, Plus, Users, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { PERMISSIONS, getPermissionsByCategory } from '../../utils/permissions';

export default function RoleManagement() {
  const { hasPermission, user } = useAuth();
  const canManageRoles = hasPermission('admin.roles');

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

  const getAuthHeaders = () => {
    const token = user?.token || (() => {
      try {
        const saved = localStorage.getItem('udriver_user');
        if (!saved) return null;
        const parsed = JSON.parse(saved);
        return parsed?.token || null;
      } catch (err) { return null; }
    })();

    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const [roles, setRoles] = useState([]);
  const [managers, setManagers] = useState([]);

  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [selectedManagerId, setSelectedManagerId] = useState('');

  const [permissions, setPermissions] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const permissionCategories = getPermissionsByCategory();

  /* ---------------- FETCH DATA ---------------- */

  useEffect(() => {
    fetchRoles();
    fetchManagers();
  }, []);

  const fetchRoles = async () => {
    const res = await fetch(`${API_BASE}/api/roles`);
    const json = await res.json();
    setRoles(json.data || []);
    if (json.data?.length) setSelectedRoleId(json.data[0].id);
  };

  const fetchManagers = async () => {
    const res = await fetch(`${API_BASE}/api/managers?page=1&limit=100`);
    const json = await res.json();
    setManagers(json.data || []);
  };

  /* --------- UPDATE PERMISSIONS WHEN SELECTING --------- */

  useEffect(() => {
    if (!selectedRoleId) return;
    const role = roles.find(r => r.id === selectedRoleId);
    setPermissions(new Set(role?.permissions || []));
    setSelectedManagerId('');
  }, [selectedRoleId]);

  useEffect(() => {
    if (!selectedManagerId) return;
    const manager = managers.find(m => m._id === selectedManagerId);

    if (manager?.permissions?.length) {
      setPermissions(new Set(manager.permissions));
    } else if (manager?.role) {
      const role = roles.find(r => r.id === manager.role);
      setPermissions(new Set(role?.permissions || []));
    }
  }, [selectedManagerId]);

  /* ---------------- HELPERS ---------------- */

  const togglePermission = (perm) => {
    setPermissions(prev => {
      const copy = new Set(prev);
      copy.has(perm) ? copy.delete(perm) : copy.add(perm);
      return copy;
    });
  };

  const savePermissions = async () => {
    setSaving(true);
    // Debug: surface current auth state so we can diagnose missing token issues
    try {
      console.debug('RoleManagement.savePermissions debug', {
        user,
        token: user?.token,
        authHeaders: getAuthHeaders(),
        localStorage_udriver_user: localStorage.getItem('udriver_user'),
        API_BASE,
        selectedManagerId,
        selectedRoleId
      });
    } catch (err) {
      // ignore debug errors
    }

    try {
      if (selectedManagerId) {
        const res = await fetch(`${API_BASE}/api/managers/${selectedManagerId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ permissions: Array.from(permissions) })
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          // Log full server response for debugging
          console.error('Failed to update manager permissions', res.status, json);
          const message = json.error || json.message || `Failed to update user permissions (status: ${res.status})`;
          // If no auth header is present, give a clear hint to the admin
          if (!getAuthHeaders().Authorization && res.status === 401) {
            alert('Not authenticated — no token found. Please log in again before updating permissions.');
          } else {
            alert(message);
          }
          return;
        }
        alert('User permissions updated. Note: the staff member will need to log out and log back in for the changes to take effect.');
      } else {
        const res = await fetch(`${API_BASE}/api/roles/${selectedRoleId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ permissions: Array.from(permissions) })
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          alert(json.error || `Failed to update role permissions (status: ${res.status})`);
          return;
        }
        alert('Role permissions updated');
      }
      // Only refresh lists on success
      fetchRoles();
      fetchManagers();
    } catch (err) {
      alert('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Role Management</h1>
          <p className="text-sm text-gray-500">Manage roles and permissions</p>
        </div>
       
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
       
        <div className="card">
          <Users /> Staff: {managers.length}
        </div>
        <div className="card">
          <CheckCircle /> Permissions: {Object.keys(PERMISSIONS).length}
        </div>
      </div>

      {/* Selectors */}
      <div className="card flex gap-4 w-full items-center">
  <select
    value={selectedManagerId}
    onChange={e => setSelectedManagerId(e.target.value)}
    className="border px-3 py-2 rounded w-full"
  >
    <option value="">Apply to Role</option>
    {managers
      .filter(m => !selectedRoleId || m.role === selectedRoleId)
      .map(m => (
        <option key={m._id} value={m._id}>
          {m.name} ({m.department})
        </option>
      ))}
  </select>
</div>


      {/* Permissions Table */}
    <div className="card">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {Object.entries(permissionCategories).map(([cat, perms]) => (
      <div key={cat} className="border rounded">
        <div className="bg-gray-100 px-3 py-2 font-semibold uppercase text-sm">
          {cat.replace('_', ' ')}
        </div>

        <div className="divide-y">
          {perms.map(p => (
            <div key={p.value} className="flex items-center justify-between px-3 py-2">
              <span className="text-sm">{p.value}</span>
              <input
                type="checkbox"
                checked={permissions.has(p.value)}
                onChange={() => togglePermission(p.value)}
              />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
</div>


      {/* Actions */}
      {canManageRoles && (
        <div className="flex justify-end">
          <button
            disabled={saving}
            onClick={savePermissions}
            className="btn btn-primary"
          >
            {saving ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
      )}
    </div>
  );
}
