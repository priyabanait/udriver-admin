import { X, User, Mail, Phone, Shield, Building, Calendar, Clock, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import { ROLES, formatRoleName } from '../../utils/permissions';
import { formatDate, formatDateTime } from '../../utils';

export default function AdminUserDetailModal({ isOpen, onClose, user, onEdit }) {
  if (!isOpen || !user) return null;

  const role = ROLES[user.role?.toUpperCase()];

  const getRoleBadge = (roleId) => {
    const roleInfo = ROLES[roleId?.toUpperCase()];
    if (!roleInfo) return <span className="badge badge-info">{formatRoleName(roleId)}</span>;
    
    const colorClass = {
      red: 'bg-red-100 text-red-800',
      blue: 'bg-blue-100 text-blue-800',
      green: 'bg-green-100 text-green-800',
      purple: 'bg-purple-100 text-purple-800',
      orange: 'bg-orange-100 text-orange-800',
      indigo: 'bg-indigo-100 text-indigo-800',
      gray: 'bg-gray-100 text-gray-800'
    }[roleInfo.color] || 'bg-gray-100 text-gray-800';

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        <Shield className="h-3 w-3 mr-1" />
        {roleInfo.name}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-red-100 text-red-800',
      suspended: 'bg-yellow-100 text-yellow-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.active}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-lg font-medium text-primary-700">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{user.name}</h2>
                <p className="text-sm text-gray-600">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {onEdit && (
                <button
                  onClick={() => onEdit(user)}
                  className="btn btn-primary btn-sm"
                >
                  Edit User
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Basic Information */}
              <div className="lg:col-span-2 space-y-6">
                <div className="card">
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Full Name</label>
                        <div className="mt-1 flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{user.name}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <div className="mt-1 flex items-center">
                          <Mail className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{user.email}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                        <div className="mt-1 flex items-center">
                          <Phone className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{user.phone}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Department</label>
                        <div className="mt-1 flex items-center">
                          <Building className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{user.department}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Join Date</label>
                        <div className="mt-1 flex items-center">
                          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{formatDate(user.joinDate)}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Last Login</label>
                        <div className="mt-1 flex items-center">
                          <Clock className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{formatDateTime(user.lastLogin)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Role & Permissions */}
                <div className="card">
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Role & Permissions</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Current Role</label>
                        {getRoleBadge(user.role)}
                      </div>
                      
                      {role && (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <p className="text-sm text-gray-600">{role.description}</p>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Permissions ({role.permissions.length})
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                              {role.permissions.map((permission) => (
                                <div
                                  key={permission}
                                  className="flex items-center p-2 bg-gray-50 rounded text-xs"
                                >
                                  <div className="h-2 w-2 bg-green-400 rounded-full mr-2"></div>
                                  {permission.replace(/\./g, ' ').replace(/_/g, ' ')}
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status & Activity */}
              <div className="space-y-6">
                <div className="card">
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Status</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Account Status</label>
                        {getStatusBadge(user.status)}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">User ID</label>
                        <span className="text-sm text-gray-900 font-mono">{user.id}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      <Activity className="h-5 w-5 inline mr-2" />
                      Activity Summary
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Login Sessions</span>
                        <span className="text-sm font-medium text-gray-900">24</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Actions Performed</span>
                        <span className="text-sm font-medium text-gray-900">156</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Days Active</span>
                        <span className="text-sm font-medium text-gray-900">45</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                    <div className="space-y-2">
                      <button className="w-full btn btn-outline btn-sm">
                        Reset Password
                      </button>
                      <button
                        className="w-full btn btn-outline btn-sm"
                        onClick={async () => {
                          try {
                            const title = window.prompt('Notification title');
                            if (!title) return;
                            const message = window.prompt('Message');
                            if (!message) return;
                            const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';
                            const res = await fetch(`${API_BASE}/api/notifications`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                type: 'admin_message',
                                title,
                                message,
                                recipientType: user.role || 'manager',
                                recipientId: user.id
                              })
                            });
                            if (!res.ok) throw new Error('Failed to send notification');
                            toast.success('Notification sent');
                          } catch (err) {
                            toast.error(err.message || 'Failed to send notification');
                          }
                        }}
                      >
                        Send Notification
                      </button>
                      <button className="w-full btn btn-outline btn-sm">
                        View Activity Log
                      </button>
                      {user.status === 'active' ? (
                        <button className="w-full btn btn-outline btn-sm text-red-600 border-red-300 hover:bg-red-50">
                          Suspend User
                        </button>
                      ) : (
                        <button className="w-full btn btn-outline btn-sm text-green-600 border-green-300 hover:bg-green-50">
                          Activate User
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}