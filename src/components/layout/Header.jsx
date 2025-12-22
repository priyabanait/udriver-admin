import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  LogOut,
  User,
  Settings
} from 'lucide-react';
import NotificationBell from '../ui/NotificationBell';

export default function Header({ onToggleSidebar, sidebarCollapsed }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Dashboard';
    if (path.startsWith('/drivers')) return 'Driver Management';
    if (path.startsWith('/vehicles')) return 'Vehicle Management';
    if (path.startsWith('/plans')) return 'Driver Plans';
    if (path.startsWith('/investments')) return 'Investment Management';
    if (path.startsWith('/payments')) return 'Payment Management';
    if (path.startsWith('/expenses')) return 'Expense Management';
    if (path.startsWith('/reports')) return 'Analytics & Reports';
    if (path.startsWith('/tickets')) return 'Ticket System';
    if (path.startsWith('/hr')) return 'HR Management';
    if (path.startsWith('/settings')) return null;
    return 'UDriver Admin';
  };

  const pageTitle = getPageTitle();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <div className="ml-4 lg:ml-0">
            {pageTitle && (
              <h1 className="text-2xl font-semibold text-gray-900">{pageTitle}</h1>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Notification bell */}
          <div>
            <NotificationBell />
          </div>

          {/* Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-100"
            >
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-700">
                  {user?.name?.charAt(0)}
                </span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-700">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">
                  {user?.role === 'fleet_manager' ? 'Manager' : user?.role?.replace('_', ' ')}
                </p>
              </div>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      navigate('/settings');
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <User className="h-4 w-4 mr-3" />
                    Profile
                  </button>
                  {/* <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <Settings className="h-4 w-4 mr-3" />
                    Settings
                  </button> */}
                  <hr className="my-1" />
                  <button 
                    onClick={logout}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}