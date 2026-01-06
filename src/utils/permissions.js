// Permission constants
export const PERMISSIONS = {
  // Dashboard permissions
  DASHBOARD_VIEW: 'dashboard.view',
  DASHBOARD_ANALYTICS: 'dashboard.analytics',
  
  // Driver management permissions
  DRIVERS_VIEW: 'drivers.view',
  DRIVERS_CREATE: 'drivers.create',
  DRIVERS_EDIT: 'drivers.edit',
    REPORTS_EXPORT: 'reports.export',
  DRIVERS_DELETE: 'drivers.delete',
  DRIVERS_KYC: 'drivers.kyc',
  DRIVERS_PERFORMANCE: 'drivers.performance',
  
  // Vehicle management permissions
  VEHICLES_VIEW: 'vehicles.view',
  VEHICLES_CREATE: 'vehicles.create',
  VEHICLES_EDIT: 'vehicles.edit',
  VEHICLES_DELETE: 'vehicles.delete',
  VEHICLES_ASSIGN: 'vehicles.assign',
  
  // Investment Management
  INVESTMENTS_VIEW: 'investments:view',
  INVESTMENTS_CREATE: 'investments:create',
  INVESTMENTS_EDIT: 'investments:edit',
  INVESTMENTS_DELETE: 'investments:delete',
  INVESTMENTS_ANALYTICS: 'investments:analytics',

  // Expense Management
  EXPENSES_VIEW: 'expenses:view',
  EXPENSES_CREATE: 'expenses:create',
  EXPENSES_EDIT: 'expenses:edit',
  EXPENSES_DELETE: 'expenses:delete',
  EXPENSES_APPROVE: 'expenses:approve',

 ATTENDANCE_VIEW: 'attendance.view',
ATTENDANCE_CREATE: 'attendance.create',
ATTENDANCE_EDIT: 'attendance.edit',
ATTENDANCE_APPROVE: 'attendance.approve',
  
  // Payment management permissions
  PAYMENTS_VIEW: 'payments.view',
  PAYMENTS_CREATE: 'payments.create',
  PAYMENTS_EDIT: 'payments.edit',
  PAYMENTS_PROCESS: 'payments.process',
  PAYMENTS_REFUND: 'payments.refund',
  PAYMENTS_ANALYTICS: 'payments.analytics',
  
  // Plans management permissions
  PLANS_VIEW: 'plans.view',
  PLANS_CREATE: 'plans.create',
  PLANS_EDIT: 'plans.edit',
  PLANS_DELETE: 'plans.delete',
  
  // Admin management permissions
  ADMIN_VIEW: 'admin.view',
  ADMIN_CREATE: 'admin.create',
  ADMIN_EDIT: 'admin.edit',
  ADMIN_DELETE: 'admin.delete',
  ADMIN_ROLES: 'admin.roles',
  
  // HR management permissions
  HR_VIEW: 'hr.view',
  HR_CREATE: 'hr.create',
  HR_EDIT: 'hr.edit',
  HR_DELETE: 'hr.delete',
  HR_PAYROLL: 'hr.payroll',
  
  // Ticket system permissions
  // TICKETS_VIEW: 'tickets.view',
  // TICKETS_CREATE: 'tickets.create',
  // TICKETS_EDIT: 'tickets.edit',
  // TICKETS_DELETE: 'tickets.delete',
  // TICKETS_ASSIGN: 'tickets.assign',
  
  // Settings permissions
  // SETTINGS_VIEW: 'settings.view',
  // SETTINGS_EDIT: 'settings.edit',
  // SETTINGS_SYSTEM: 'settings.system',
  
  // Reports permissions
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',
  REPORTS_FINANCIAL: 'reports.financial',
  REPORTS_PERFORMANCE: 'reports.performance',
  
  // Notification permissions
  NOTIFICATIONS_VIEW: 'notifications.view',
  NOTIFICATIONS_SEND: 'notifications.send',
  NOTIFICATIONS_SCHEDULE: 'notifications.schedule',
  NOTIFICATIONS_DELETE: 'notifications.delete',
};

// Role definitions with their permissions
export const ROLES = {
  SUPER_ADMIN: {
    id: 'super_admin',
    name: 'Super Admin',
    description: 'Full access to all features and settings',
    permissions: Object.values(PERMISSIONS), // All permissions
    color: 'red'
  },
  
  FLEET_MANAGER: {
    id: 'fleet_manager',
    name: 'Manager',
    description: 'Manage drivers, vehicles, fleet operations, and investments',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.DASHBOARD_ANALYTICS,
      PERMISSIONS.DRIVERS_VIEW,
      // DRIVERS_CREATE intentionally omitted for manager
      PERMISSIONS.REPORTS_EXPORT,
      PERMISSIONS.DRIVERS_EDIT,
      PERMISSIONS.DRIVERS_KYC,
      PERMISSIONS.DRIVERS_PERFORMANCE,
      PERMISSIONS.VEHICLES_VIEW,
      PERMISSIONS.VEHICLES_CREATE,
      PERMISSIONS.VEHICLES_EDIT,
      PERMISSIONS.VEHICLES_ASSIGN,
      PERMISSIONS.PLANS_VIEW,
      PERMISSIONS.PLANS_CREATE,
      PERMISSIONS.PLANS_EDIT,
      PERMISSIONS.EXPENSES_VIEW,
      PERMISSIONS.EXPENSES_CREATE,
      PERMISSIONS.EXPENSES_EDIT,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.REPORTS_PERFORMANCE,
      PERMISSIONS.TICKETS_VIEW,
      PERMISSIONS.TICKETS_CREATE,
      PERMISSIONS.TICKETS_EDIT,
      // Investment permissions added for manager
      PERMISSIONS.INVESTMENTS_VIEW,
      PERMISSIONS.INVESTMENTS_CREATE,
      PERMISSIONS.INVESTMENTS_EDIT,
      PERMISSIONS.INVESTMENTS_DELETE,
      PERMISSIONS.INVESTMENTS_ANALYTICS,
      // Payment permissions added for manager
      PERMISSIONS.PAYMENTS_VIEW,
      PERMISSIONS.PAYMENTS_CREATE,
      PERMISSIONS.PAYMENTS_EDIT,
      PERMISSIONS.PAYMENTS_PROCESS,
      // Notification permissions
      PERMISSIONS.NOTIFICATIONS_VIEW,
      PERMISSIONS.NOTIFICATIONS_SEND,
      PERMISSIONS.NOTIFICATIONS_SCHEDULE,
    ],
    color: 'blue'
  },
  
  FINANCE_ADMIN: {
    id: 'finance_admin',
    name: 'Finance Admin',
    description: 'Manage investments, payments, and financial operations',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.DASHBOARD_ANALYTICS,
      PERMISSIONS.INVESTMENTS_VIEW,
      PERMISSIONS.INVESTMENTS_CREATE,
      PERMISSIONS.INVESTMENTS_EDIT,
      PERMISSIONS.INVESTMENTS_ANALYTICS,
      PERMISSIONS.EXPENSES_VIEW,
      PERMISSIONS.EXPENSES_CREATE,
      PERMISSIONS.EXPENSES_EDIT,
      PERMISSIONS.EXPENSES_APPROVE,
      PERMISSIONS.PAYMENTS_VIEW,
      PERMISSIONS.PAYMENTS_CREATE,
      PERMISSIONS.PAYMENTS_EDIT,
      PERMISSIONS.PAYMENTS_PROCESS,
      PERMISSIONS.PAYMENTS_REFUND,
      PERMISSIONS.PAYMENTS_ANALYTICS,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.REPORTS_EXPORT,
      PERMISSIONS.REPORTS_FINANCIAL,
      PERMISSIONS.PLANS_VIEW,
      // Notification permissions
      PERMISSIONS.NOTIFICATIONS_VIEW,
      PERMISSIONS.NOTIFICATIONS_SEND,
      PERMISSIONS.NOTIFICATIONS_SCHEDULE,
    ],
    color: 'green'
  },
  
 HR_MANAGER: {
  id: 'hr_manager',
  name: 'HR Manager',
  description: 'Manage employees, attendance, and payroll',
  permissions: [
    PERMISSIONS.DASHBOARD_VIEW,

    // ✅ Attendance
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.ATTENDANCE_CREATE,
    PERMISSIONS.ATTENDANCE_EDIT,

    // HR
    PERMISSIONS.HR_VIEW,
    PERMISSIONS.HR_CREATE,
    PERMISSIONS.HR_EDIT,
    PERMISSIONS.HR_PAYROLL,

    // Optional
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_EXPORT,
    
    // Notification permissions
    PERMISSIONS.NOTIFICATIONS_VIEW,
    PERMISSIONS.NOTIFICATIONS_SEND,
  ],
  color: 'purple'
},

  
  OPERATIONS_MANAGER: {
    id: 'operations_manager',
    name: 'Operations Manager',
    description: 'Manage day-to-day operations and tickets',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.DRIVERS_VIEW,
      PERMISSIONS.DRIVERS_EDIT,
      PERMISSIONS.VEHICLES_VIEW,
      PERMISSIONS.VEHICLES_EDIT,
       PERMISSIONS.REPORTS_EXPORT,
      PERMISSIONS.VEHICLES_ASSIGN,
      PERMISSIONS.TICKETS_VIEW,
      PERMISSIONS.TICKETS_CREATE,
      PERMISSIONS.TICKETS_EDIT,
      PERMISSIONS.TICKETS_ASSIGN,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.REPORTS_PERFORMANCE,
    ],
    color: 'orange'
  },
  
  SUPPORT_AGENT: {
    id: 'support_agent',
    name: 'Support Agent',
    description: 'Handle customer support and basic operations',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.DRIVERS_VIEW,
      PERMISSIONS.VEHICLES_VIEW,
      PERMISSIONS.TICKETS_VIEW,
      PERMISSIONS.TICKETS_CREATE,
      PERMISSIONS.TICKETS_EDIT,
      PERMISSIONS.REPORTS_VIEW,
    ],
    color: 'indigo'
  },
  
  AUDITOR: {
    id: 'auditor',
    name: 'Auditor',
    description: 'View-only access for auditing and compliance',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.DRIVERS_VIEW,
      PERMISSIONS.VEHICLES_VIEW,
      PERMISSIONS.INVESTMENTS_VIEW,
      PERMISSIONS.EXPENSES_VIEW,
      PERMISSIONS.PAYMENTS_VIEW,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.REPORTS_EXPORT,
      PERMISSIONS.REPORTS_FINANCIAL,
      PERMISSIONS.REPORTS_PERFORMANCE,
    ],
    color: 'gray'
  }
};

// Helper functions
export const getRoleById = (roleId) => {
  return Object.values(ROLES).find(role => role.id === roleId);
};

export const hasPermission = (userPermissions, requiredPermission) => {
  if (!userPermissions || !Array.isArray(userPermissions)) return false;
  return userPermissions.includes(requiredPermission);
};

export const hasAnyPermission = (userPermissions, requiredPermissions) => {
  if (!userPermissions || !Array.isArray(userPermissions)) return false;
  return requiredPermissions.some(permission => userPermissions.includes(permission));
};

export const hasAllPermissions = (userPermissions, requiredPermissions) => {
  if (!userPermissions || !Array.isArray(userPermissions)) return false;
  return requiredPermissions.every(permission => userPermissions.includes(permission));
};

export const getPermissionsByCategory = () => {
  const categories = {};
  
  Object.entries(PERMISSIONS).forEach(([key, value]) => {
    const [category] = value.split('.');
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push({ key, value, label: key.replace(/_/g, ' ') });
  });
  
  return categories;
};

export const formatRoleName = (roleId) => {
  const role = getRoleById(roleId);
  return role ? role.name : roleId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};