import { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Shield, Building, Calendar } from 'lucide-react';
import { ROLES } from '../../utils/permissions';
import toast from 'react-hot-toast';

export default function AdminUserModal({ isOpen, onClose, user = null, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'support_agent',
    department: '',
    status: 'active'
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        password: '',
        confirmPassword: '',
        phone: user.phone || '',
        role: user.role || 'support_agent',
        department: user.department || '',
        status: user.status || 'active'
      });
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        role: 'support_agent',
        department: '',
        status: 'active'
      });
    }
    setErrors({});
  }, [user, isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    
    if (!user) { // Only validate password for new users
      if (!formData.password) newErrors.password = 'Password is required';
      else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
      
      if (!formData.confirmPassword) newErrors.confirmPassword = 'Confirm password is required';
      else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (!formData.department.trim()) newErrors.department = 'Department is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const userData = {
        ...formData,
        id: user?.id || Date.now(),
        joinDate: user?.joinDate || new Date().toISOString().split('T')[0],
        lastLogin: user?.lastLogin || new Date().toISOString(),
        permissions: ROLES[formData.role.toUpperCase()]?.permissions || []
      };

      // Remove password fields for security
      if (user) {
        delete userData.password;
        delete userData.confirmPassword;
      }

      onSave(userData);
      toast.success(user ? 'Admin user updated successfully' : 'Admin user created successfully');
      onClose();
    } catch (error) {
      toast.error('Failed to save admin user');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {user ? 'Edit Admin User' : 'Add New Admin User'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="h-4 w-4 inline mr-2" />
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`input ${errors.name ? 'border-red-300' : ''}`}
                  placeholder="Enter full name"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`input ${errors.email ? 'border-red-300' : ''}`}
                  placeholder="Enter email address"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="h-4 w-4 inline mr-2" />
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className={`input ${errors.phone ? 'border-red-300' : ''}`}
                  placeholder="+91 98765 43210"
                />
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building className="h-4 w-4 inline mr-2" />
                  Department *
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  className={`input ${errors.department ? 'border-red-300' : ''}`}
                >
                  <option value="">Select Department</option>
                  <option value="Administration">Administration</option>
                  <option value="Fleet Operations">Fleet Operations</option>
                  <option value="Finance">Finance</option>
                  <option value="Human Resources">Human Resources</option>
                  <option value="Operations">Operations</option>
                  <option value="Customer Support">Customer Support</option>
                  <option value="Audit & Compliance">Audit & Compliance</option>
                  <option value="Technology">Technology</option>
                  <option value="Marketing">Marketing</option>
                </select>
                {errors.department && <p className="mt-1 text-sm text-red-600">{errors.department}</p>}
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Shield className="h-4 w-4 inline mr-2" />
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  className="input"
                >
                  {Object.values(ROLES).map(role => (
                    <option key={role.id} value={role.id}>
                      {role.name} - {role.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="input"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            {/* Password fields - only for new users */}
            {!user && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`input ${errors.password ? 'border-red-300' : ''}`}
                    placeholder="Enter password"
                  />
                  {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className={`input ${errors.confirmPassword ? 'border-red-300' : ''}`}
                    placeholder="Confirm password"
                  />
                  {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
                </div>
              </div>
            )}

            {/* Role Permissions Preview */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Role Permissions</h4>
              <div className="text-xs text-gray-600">
                {ROLES[formData.role.toUpperCase()]?.description}
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {ROLES[formData.role.toUpperCase()]?.permissions.slice(0, 6).map((permission, index) => (
                  <span
                    key={permission}
                    className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800"
                  >
                    {permission.replace(/\./g, ' ').replace(/_/g, ' ')}
                  </span>
                ))}
                {ROLES[formData.role.toUpperCase()]?.permissions.length > 6 && (
                  <span className="text-xs text-gray-500">
                    +{ROLES[formData.role.toUpperCase()].permissions.length - 6} more
                  </span>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {user ? 'Updating...' : 'Creating...'}
                  </div>
                ) : (
                  user ? 'Update User' : 'Create User'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}