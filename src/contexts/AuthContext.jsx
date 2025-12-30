import { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ROLES, PERMISSIONS, hasPermission as checkPermission, hasAnyPermission, hasAllPermissions } from '../utils/permissions';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Enhanced mock users with detailed roles and permissions
const MOCK_USERS = [
  {
    id: 1,
    email: 'admin@udrive.com',
    password: 'admin123',
    name: 'Admin',
    role: 'super_admin',
    permissions: ROLES.SUPER_ADMIN.permissions,
    avatar: null,
    phone: '+91 98765 43210',
    department: 'Administration',
    joinDate: '2023-01-15',
    lastLogin: new Date().toISOString(),
    status: 'active'
  },
  {
    id: 2,
    email: 'manager@udrive.com',
    password: 'manager123',
    name: 'Manager',
    role: 'fleet_manager',
    permissions: ROLES.FLEET_MANAGER.permissions,
    avatar: null,
    phone: '+91 98765 43211',
    department: 'Fleet Operations',
    joinDate: '2023-02-10',
    lastLogin: new Date().toISOString(),
    status: 'active'
  },
  {
    id: 3,
    email: 'finance@udrive.com',
    password: 'finance123',
    name: 'Finance',
    role: 'finance_admin',
    permissions: ROLES.FINANCE_ADMIN.permissions,
    avatar: null,
    phone: '+91 98765 43212',
    department: 'Finance',
    joinDate: '2023-01-20',
    lastLogin: new Date().toISOString(),
    status: 'active'
  },
  {
    id: 4,
    email: 'hr@udrive.com',
    password: 'hr123',
    name: 'Lisa Rodriguez',
    role: 'hr_manager',
    permissions: ROLES.HR_MANAGER.permissions,
    avatar: null,
    phone: '+91 98765 43213',
    department: 'Human Resources',
    joinDate: '2023-03-05',
    lastLogin: new Date().toISOString(),
    status: 'active'
  },
  {
    id: 5,
    email: 'operations@udrive.com',
    password: 'ops123',
    name: 'David Kumar',
    role: 'operations_manager',
    permissions: ROLES.OPERATIONS_MANAGER.permissions,
    avatar: null,
    phone: '+91 98765 43214',
    department: 'Operations',
    joinDate: '2023-02-28',
    lastLogin: new Date().toISOString(),
    status: 'active'
  },
  {
    id: 6,
    email: 'support@udrive.com',
    password: 'support123',
    name: 'Priya Sharma',
    role: 'support_agent',
    permissions: ROLES.SUPPORT_AGENT.permissions,
    avatar: null,
    phone: '+91 98765 43215',
    department: 'Customer Support',
    joinDate: '2023-04-12',
    lastLogin: new Date().toISOString(),
    status: 'active'
  },
  {
    id: 7,
    email: 'auditor@udrive.com',
    password: 'audit123',
    name: 'Robert Wilson',
    role: 'auditor',
    permissions: ROLES.AUDITOR.permissions,
    avatar: null,
    phone: '+91 98765 43216',
    department: 'Audit & Compliance',
    joinDate: '2023-03-20',
    lastLogin: new Date().toISOString(),
    status: 'active'
  }
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in from localStorage
    const savedUser = localStorage.getItem('udriver_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        if (parsed.token) localStorage.setItem('token', parsed.token);
      } catch (error) {
        localStorage.removeItem('udriver_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      // Check mock users first
      const foundUser = MOCK_USERS.find(
        u => u.email === email && u.password === password
      );
      if (foundUser) {
        const userWithoutPassword = { ...foundUser };
        delete userWithoutPassword.password;
        userWithoutPassword.lastLogin = new Date().toISOString();
        // Provide a dev-only mock token so dev auth-protected endpoints can be exercised
        userWithoutPassword.token = 'mock';
        setUser(userWithoutPassword);
        localStorage.setItem('udriver_user', JSON.stringify(userWithoutPassword));
        // Also mirror token to the legacy 'token' key used by some components
        localStorage.setItem('token', 'mock');
        toast.success(`Welcome back, ${userWithoutPassword.name}!`);
        setLoading(false);
        return { success: true };
      }
      // If not a mock user, try backend manager login
      const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
      const response = await fetch(`${API_BASE}/api/managers/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) {
        const data = await response.json();
        setLoading(false);
        toast.error(data.message || 'Invalid credentials');
        return { success: false, message: data.message || 'Invalid credentials' };
      }
      const data = await response.json();
      let userWithoutPassword = { ...data.user, token: data.token };

      // Enrich with manager details when available
      try {
        const detailRes = await fetch(`${API_BASE}/api/managers/${data.user.id}`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${data.token}`
          }
        });

        if (detailRes.ok) {
          const detail = await detailRes.json();
          userWithoutPassword = {
            ...userWithoutPassword,
            ...detail,
            phone: detail.mobile || userWithoutPassword.phone,
            department: detail.department || userWithoutPassword.department,
            status: detail.status || userWithoutPassword.status,
            joinDate: detail.createdAt || userWithoutPassword.joinDate
          };
        }
      } catch (err) {
        // If detail fetch fails, continue with basic user data
      }

      userWithoutPassword.lastLogin = new Date().toISOString();
      setUser(userWithoutPassword);
      localStorage.setItem('udriver_user', JSON.stringify(userWithoutPassword));
      // Persist token separately for code that reads localStorage.getItem('token')
      if (userWithoutPassword.token) localStorage.setItem('token', userWithoutPassword.token);
      toast.success(`Welcome back, ${userWithoutPassword.name}!`);
      setLoading(false);
      return { success: true }; 
    } catch (error) {
      setLoading(false);
      toast.error('Login failed. Please try again.');
      return { success: false, message: 'Login failed' };
    }
  };

  const logout = async () => {
    // Track logout time for managers
    const currentUser = user || JSON.parse(localStorage.getItem('udriver_user') || 'null');
    if (currentUser && currentUser.role === 'fleet_manager' && currentUser.id) {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
        await fetch(`${API_BASE}/api/managers/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ managerId: currentUser.id })
        });
      } catch (err) {
        // Silently fail - logout should still proceed
        console.warn('Failed to track logout time:', err);
      }
    }
    
    setUser(null);
    localStorage.removeItem('udriver_user');
    localStorage.removeItem('token');
    toast.success('Logged out successfully');
  };

  const forgotPassword = async (email) => {
    setLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const foundUser = MOCK_USERS.find(u => u.email === email);
      
      if (foundUser) {
        toast.success('Password reset link sent to your email');
        setLoading(false);
        return { success: true };
      } else {
        toast.error('Email not found');
        setLoading(false);
        return { success: false, message: 'Email not found' };
      }
    } catch (error) {
      setLoading(false);
      toast.error('Failed to send reset link');
      return { success: false, message: 'Failed to send reset link' };
    }
  };

  // Enhanced permission checking
  const hasPermission = (permission) => {
    if (!user || !user.permissions) return false;
    return checkPermission(user.permissions, permission);
  };

  const hasAnyPermissions = (permissions) => {
    if (!user || !user.permissions) return false;
    return hasAnyPermission(user.permissions, permissions);
  };

  const hasAllRequiredPermissions = (permissions) => {
    if (!user || !user.permissions) return false;
    return hasAllPermissions(user.permissions, permissions);
  };

  const isSuperAdmin = () => {
    // Check role first
    if (user?.role === 'super_admin') return true;
    // Fallback: check if user has all admin permissions (super admin permissions)
    if (user?.permissions && Array.isArray(user.permissions)) {
      const adminPermissions = [
        PERMISSIONS.ADMIN_VIEW,
        PERMISSIONS.ADMIN_CREATE,
        PERMISSIONS.ADMIN_EDIT,
        PERMISSIONS.ADMIN_DELETE
      ];
      // Check if user has all admin permissions (likely a super admin)
      const hasAllAdminPerms = adminPermissions.every(perm => 
        user.permissions.includes(perm)
      );
      // Also check if user has all permissions (super admin has all permissions)
      const hasAllPermissions = user.permissions.length === Object.values(PERMISSIONS).length;
      return hasAllAdminPerms || hasAllPermissions;
    }
    return false;
  };

  const getUserRole = () => {
    return user?.role ? ROLES[user.role.toUpperCase()] : null;
  };

  const getAllUsers = () => {
    return MOCK_USERS.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  };

  const value = {
    user,
    token: user?.token,
    login,
    logout,
    forgotPassword,
    hasPermission,
    hasAnyPermissions,
    hasAllRequiredPermissions,
    isSuperAdmin,
    getUserRole,
    getAllUsers,
    loading,
    isAuthenticated: !!user,
    mockUsers: MOCK_USERS.map(u => ({ email: u.email, password: u.password, name: u.name, role: u.role }))
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}