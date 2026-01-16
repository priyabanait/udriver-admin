import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PERMISSIONS } from '../../utils/permissions';
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Car,
  TrendingUp,
  CreditCard,
  Shield,
  MessageSquare,
  UserCheck,
  Settings,
  FileText,
  PlusCircle,
  BarChart3,
  Wallet,
  MapPin,
  Clock,
  Sliders,
 Database,
  ClipboardList,
  ChevronDown,
  CheckCircle,
  ChevronRight,
  Receipt,
  Building,
  Target,
  Bell,
  IndianRupee 
} from 'lucide-react';
import { cn } from '../../utils';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    permission: PERMISSIONS.DASHBOARD_VIEW
  },
  {
    name: 'Vehicle Management',
    icon: Car,
    permission: PERMISSIONS.VEHICLES_VIEW,
    children: [
      { 
        name: 'All Vehicles', 
        href: '/vehicles/allvehicles',
        permission: PERMISSIONS.VEHICLES_VIEW
      },
      // { 
      //   name: 'Add Vehicle', 
      //   href: '/vehicles/add',
      //   permission: PERMISSIONS.VEHICLES_CREATE
      // },
      // { 
      //   name: 'Assignments', 
      //   href: '/vehicles/assignments',
      //   permission: PERMISSIONS.VEHICLES_ASSIGN
      // },
      { 
        name: 'Documents', 
        href: '/vehicles/documents',
        permission: PERMISSIONS.VEHICLES_VIEW
      }
    ]
  },
  {
    name: 'Driver Management',
    icon: Users,
    permission: PERMISSIONS.DRIVERS_VIEW,
    children: [
      { 
        name: 'All Drivers', 
        href: '/drivers',
        permission: PERMISSIONS.DRIVERS_VIEW
      },
      // { 
      //   name: 'Driver login', 
      //   href: '/drivers/login',
      //   permission: PERMISSIONS.DRIVERS_VIEW
      // },
       { 
        name: 'Driver Wallet', 
        href: '/drivers/wallet',
        permission: PERMISSIONS.DRIVERS_VIEW
      },
       { 
        name: 'Driver Wallet Messages', 
        href: '/drivers/wallet-messages',
        permission: PERMISSIONS.DRIVERS_VIEW
      },
      // { 
      //   name: 'Driver Status', 
      //   href: '/drivers/status',
      //   permission: PERMISSIONS.DRIVERS_VIEW
      // },
      // { 
      //   name: 'Performance', 
      //   href: '/drivers/performance',
      //   permission: PERMISSIONS.DRIVERS_PERFORMANCE
      // },
     
    ]
  },
  {
    name: 'Payment Management',
    icon: CreditCard,
    permission: PERMISSIONS.PAYMENTS_VIEW,
    children: [
      // { 
      //   name: 'Payment Dashboard', 
      //   href: '/payments',
      //   permission: PERMISSIONS.PAYMENTS_VIEW
      // },
      // { 
      //   name: 'Driver Payments', 
      //   href: '/payments/drivers',
      //   permission: PERMISSIONS.PAYMENTS_VIEW
      // },
      //  { 
      //   name: 'Driver Payments', 
      //   href: '/drivers/payments',
      //   permission: PERMISSIONS.PAYMENTS_VIEW
      // }
      // { 
      //   name: 'Invester FD Payments', 
      //   href: '/payments/process',
      //   permission: PERMISSIONS.PAYMENTS_PROCESS
      // },
        { 
        name: 'Driver Payments', 
        href: '/payments/driverpayments',
        permission: PERMISSIONS.PAYMENTS_VIEW
      },
      // { 
      //   name: 'Analytics', 
      //   href: '/payments/analytics',
      //   permission: PERMISSIONS.PAYMENTS_ANALYTICS
      // }
    ]
  },
   {
    name: 'Investment Management',
    icon: Wallet,
    permission: PERMISSIONS.INVESTMENTS_VIEW,
    children: [
      // { 
      //   name: 'Invester Login', 
      //   href: '/investments/InvesterLogin',
      //   permission: PERMISSIONS.INVESTMENTS_VIEW
      // },
      { 
        name: 'All Investments', 
        href: '/investments',
        permission: PERMISSIONS.INVESTMENTS_VIEW
      },
       { 
        name: 'Investor Details', 
        href: '/investerDetails',
        permission: PERMISSIONS.INVESTMENTS_VIEW
      },
      { 
        name: 'Investment FD', 
        href: '/investments/investors',
        permission: PERMISSIONS.INVESTMENTS_VIEW
      },
       { 
        name: 'Investment Car', 
        href: '/investments/car',
        permission: PERMISSIONS.INVESTMENTS_VIEW
      },
       { 
        name: 'Investment Wallet', 
        href: '/investments/wallet',
        permission: PERMISSIONS.INVESTMENTS_VIEW
      },
      { 
        name: 'Investment Wallet Messages', 
        href: '/investments/wallet-messages',
        permission: PERMISSIONS.INVESTMENTS_VIEW
      },
      // { 
      //   name: 'Investment Plans', 
      //   href: '/investments/plans',
      //   permission: PERMISSIONS.INVESTMENTS_VIEW
      // },
      // { 
      //   name: 'Analytics', 
      //   href: '/investments/analytics',
      //   permission: PERMISSIONS.INVESTMENTS_ANALYTICS
      // }
    ]
  },
  {
    name: 'Car Plans',
    icon: Database,
    permission: PERMISSIONS.PLANS_VIEW,
    children: [
      { 
        name: 'All Plans', 
        href: '/plans',
        permission: PERMISSIONS.PLANS_VIEW
      },
      // { 
      //   name: 'Create Plan', 
      //   href: '/plans/create',
      //   permission: PERMISSIONS.PLANS_CREATE
      // },
      // { 
      //   name: 'Driver Enrollments', 
      //   href: '/plans/enrollments',
      //   permission: PERMISSIONS.PLANS_VIEW
      // },
      // { 
      //   name: 'Driver Plan Selections', 
      //   href: '/plans/selections',
      //   permission: PERMISSIONS.PLANS_VIEW
      // }
    ]
  },
  {
    name: 'Manage Employees',
    href: '/staff',
    icon: ClipboardList,
    permission: PERMISSIONS.HR_VIEW
  },
   {
    name: 'Manage Sliders',
    href: '/sliders',
    icon: Sliders,
    permission: PERMISSIONS.NOTIFICATIONS_VIEW
  },
  {
    name: 'Attendence Management',
    href: '/attendence',
    icon: Clock,
    permission: PERMISSIONS.ATTENDANCE_VIEW
  },
  
  
  // {
  //   name: 'Staff Permissions',
  //   href: '/admin/roles',
  //   icon: Shield,
  //   permission: PERMISSIONS.ADMIN_ROLES
// },
  
  
  
 
  
  {
    name: 'Notification Management',
    href: '/notification',
    icon: Bell,
    permission: PERMISSIONS.NOTIFICATIONS_VIEW
  },
  {
    name: 'Expense Management',
    icon: IndianRupee ,
    permission: PERMISSIONS.EXPENSES_VIEW,
    children: [
      { 
        name: 'All Expenses', 
        href: '/expenses',
        permission: PERMISSIONS.EXPENSES_VIEW
      },
      // { 
      //   name: 'Add Expense', 
      //   href: '/expenses/add',
      //   permission: PERMISSIONS.EXPENSES_CREATE
      // },
      // { 
      //   name: 'Expense Reports', 
      //   href: '/expenses/reports',
      //   permission: PERMISSIONS.EXPENSES_VIEW
      // },
      // { 
      //   name: 'Categories', 
      //   href: '/expenses/categories',
      //   permission: PERMISSIONS.EXPENSES_VIEW
      // }
    ]
  },
  // {
  //   name: 'Analytics & Reports',
  //   icon: BarChart3,
  //   permission: PERMISSIONS.REPORTS_VIEW,
  //   children: [
  //     { 
  //       name: 'Financial Reports', 
  //       href: '/reports/financial',
  //       permission: PERMISSIONS.REPORTS_FINANCIAL
  //     },
  //     { 
  //       name: 'Performance Reports', 
  //       href: '/reports/performance',
  //       permission: PERMISSIONS.REPORTS_PERFORMANCE
  //     },
  //     // { 
  //     //   name: 'Export Data', 
  //     //   href: '/reports/export',
  //     //   permission: PERMISSIONS.REPORTS_EXPORT
  //     // }
  //   ]
  // },
  {
    name: 'Admin Management',
    icon: Shield,
    permission: PERMISSIONS.ADMIN_VIEW,
    children: [
      // { 
      //   name: 'Admin Users', 
      //   href: '/admin/users',
      //   permission: PERMISSIONS.ADMIN_VIEW
      // },
      { 
        name: 'Roles & Permissions', 
        href: '/admin/roles',
        permission: PERMISSIONS.ADMIN_ROLES
      },
      {
        name: 'Signup Credentials',
        href: '/admin/signup-credentials',
        permission: PERMISSIONS.ADMIN_VIEW
      }
    ]
  },
 

  // {
  //   name: 'Ticket System',
  //   icon: MessageSquare,
  //   permission: PERMISSIONS.TICKETS_VIEW,
  //   children: [
  //     { 
  //       name: 'All Tickets', 
  //       href: '/tickets',
  //       permission: PERMISSIONS.TICKETS_VIEW
  //     },
  //     { 
  //       name: 'Create Ticket', 
  //       href: '/tickets/create',
  //       permission: PERMISSIONS.TICKETS_CREATE
  //     }
  //   ]
  // },
  // {
  //   name: 'HR Management',
  //   icon: UserCheck,
  //   permission: PERMISSIONS.HR_VIEW,
  //   children: [
  //     { 
  //       name: 'Employees', 
  //       href: '/hr/employees',
  //       permission: PERMISSIONS.HR_VIEW
  //     },
  //     { 
  //       name: 'Attendance', 
  //       href: '/hr/attendance',
  //       permission: PERMISSIONS.HR_VIEW
  //     },
  //     { 
  //       name: 'Payroll', 
  //       href: '/hr/payroll',
  //       permission: PERMISSIONS.HR_PAYROLL
  //     }
  //   ]
  // },
  // {
  //   name: 'Settings',
  //   icon: Settings,
  //   permission: PERMISSIONS.SETTINGS_VIEW,
  //   children: [
  //     { 
  //       name: 'General Settings', 
  //       href: '/settings/general',
  //       permission: PERMISSIONS.SETTINGS_VIEW
  //     },
  //     { 
  //       name: 'System Settings', 
  //       href: '/settings/system',
  //       permission: PERMISSIONS.SETTINGS_SYSTEM
  //     }
  //   ]
  // }
];

export default function Sidebar({ collapsed }) {
  const { user, isSuperAdmin, hasPermission } = useAuth();
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState(new Set());
  const navigate = useNavigate();
  const toggleExpanded = (itemName) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemName)) {
      newExpanded.delete(itemName);
    } else {
      newExpanded.add(itemName);
    }
    setExpandedItems(newExpanded);
  };

  const isActive = (href) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const hasAnyChildActive = (children) => {
    return children?.some(child => isActive(child.href));
  };

  // Determine super/admin flags early
  const isSuper = isSuperAdmin();
  const isAdmin = isSuper || (user?.role === 'super_admin') || hasPermission(PERMISSIONS.ADMIN_VIEW);

  // Determine HR and Onboard Team by role or department only (do not rely on permissions so admins are not misclassified)
  const isHR = (
    ((user?.role && user.role.toLowerCase().includes('hr')) ||
    (user?.department && user.department.toLowerCase().includes('hr')))
    && !isSuper
  );

  const isOnboardTeam = (
    ((user?.role && user.role.toLowerCase().includes('onboard')) ||
    (user?.department && user.department.toLowerCase().includes('onboard')))
    && !isSuper
  );

  // If user is manager, restrict certain actions, but do not treat HR or Onboard team or super admins as a manager
  const isManager = user?.role && user.role.toLowerCase().includes('manager') && !isHR && !isOnboardTeam && !isSuper;
 
  const filteredNavigation = navigation.filter((item) => {
    // Hide items that require a permission which the user doesn't have
    if (item.permission) {
      const allowed = isSuper || (user?.role === 'super_admin') || hasPermission(item.permission);
      if (!allowed) return false;
    }

    // Hide "Manage Manager" for managers
    if (isManager && item.name === 'Manage Staff') return false;

    // Onboard team: only show Driver Management
    if (isOnboardTeam) {
      return item.name === 'Driver Management';
    }

    if (isHR) {
      return (
        item.name === 'Attendence Management' ||
        item.name === 'Manage Staff'
      );
    }

    // Hide "Attendence Management" for non-admins (managers and other staff)
    if (!isAdmin && item.name === 'Attendence Management') return false;
    return true;
  });

  return (
    <div className={cn(
      'bg-white border-r border-gray-200 flex flex-col transition-all duration-300',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo */}
      <div className="h-16 flex items-center justify-center px-4 border-b border-gray-200">
        {collapsed ? (
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-sm font-bold text-white">UD</span>
          </div>
        ) : (
           <div
      className="flex items-center cursor-pointer"
      onClick={() => navigate("/")}
    >
      <img src="udrive logo.jpeg" alt="UDrive Logo" className="w-20 h-12 mr-3" />
     
  </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto scrollbar-hide">
        {filteredNavigation.map((item) => {
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedItems.has(item.name);
          const hasActiveChild = hasAnyChildActive(item.children);

          return (
            <div key={item.name}>
              {hasChildren ? (
                <>
                  <button
                    onClick={() => !collapsed && toggleExpanded(item.name)}
                    className={cn(
                      'sidebar-link w-full justify-between',
                      (hasActiveChild || isExpanded) && 'active'
                    )}
                    title={collapsed ? item.name : ''}
                  >
                    <div className="flex items-center">
                      <item.icon className="h-5 w-5 mr-3" />
                      {!collapsed && <span>{item.name}</span>}
                    </div>
                    {!collapsed && (
                      <div className="ml-auto">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    )}
                  </button>
                  
                  {!collapsed && isExpanded && (
                    <div className="ml-8 mt-1 space-y-1">
                      {item.children
                        .filter(child => !child.permission || isSuper || (user?.role === 'super_admin') || hasPermission(child.permission))
                        .map((child) => (
                        <NavLink
                          key={child.href}
                          to={child.href}
                          className={({ isActive }) => cn(
                            'block px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md',
                            isActive && 'text-primary-700 bg-primary-50'
                          )}
                        >
                          {child.name}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <NavLink
                  to={item.href}
                  className={({ isActive }) => cn(
                    'sidebar-link',
                    isActive && 'active'
                  )}
                  title={collapsed ? item.name : ''}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {!collapsed && <span>{item.name}</span>}
                </NavLink>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Info */}
      {!collapsed && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-primary-700">
                {user?.name?.charAt(0)}
              </span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">{user?.name}</p>
              <p className="text-xs text-gray-500 capitalize">
                {user?.department ? user.department : (user?.role === 'fleet_manager' ? 'Manager' : (user?.role ? user.role.replace('_', ' ') : ''))}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}