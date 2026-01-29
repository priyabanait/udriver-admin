import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Car, 
  TrendingUp, 
  IndianRupee , 
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  FileText,
  Settings,
  BarChart3,
  Wallet,
  Shield,
  Database,
  ClipboardList,
  User,
  CalendarCheck 
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { formatCurrency, formatDate } from '../../utils';
import { useAuth } from '../../contexts/AuthContext';
import { PERMISSIONS } from '../../utils/permissions';
import toast from 'react-hot-toast';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalDrivers: 0,
    activeDrivers: 0,
    totalVehicles: 0,
    activeVehicles: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    pendingKyc: 0,
    totalInvestors: 0,
    totalInvestment: 0,
    systemHealth: 0,
    lastBackup: new Date().toISOString()
  });

  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [investmentFDs, setInvestmentFDs] = useState([]);
  const [investorSignups, setInvestorSignups] = useState([]);

  const [recentActivities, setRecentActivities] = useState([]);
    const [systemAlerts, setSystemAlerts] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
        
        // Fetch all data in parallel
        const [
          driversRes,
          vehiclesRes,
          expensesRes,
          transactionsRes,
          ticketsRes,
          employeesRes,
          investorsRes,
          investorSignupRes,
          investmentFDRes
        ] = await Promise.all([
          fetch(`${API_BASE}/api/drivers/all?unlimited=true`),
          fetch(`${API_BASE}/api/vehicles/all?limit=all`),
          fetch(`${API_BASE}/api/expenses?limit=1000`),
          fetch(`${API_BASE}/api/transactions?limit=1000`),
          fetch(`${API_BASE}/api/tickets?limit=1000`).catch(() => ({ ok: false })),
          fetch(`${API_BASE}/api/employees?limit=1000`).catch(() => ({ ok: false })),
          fetch(`${API_BASE}/api/investors/all?limit=all`),
          fetch(`${API_BASE}/api/investors/signup/credentials?limit=1000`).catch(() => ({ ok: false })),
          fetch(`${API_BASE}/api/investment-fds?limit=1000`).catch(() => ({ ok: false }))
        ]);

        if (!mounted) return;

        let driversData = [];
        let vehiclesData = [];
        let expensesData = [];
        let transactionsData = [];
        let ticketsData = [];
        let employeesData = [];
        let investorsData = [];
        let investorSignupData = [];
        let investmentFDData = [];

        if (driversRes.ok) {
          const result = await driversRes.json();
          driversData = result.data || result;
        }
        if (vehiclesRes.ok) {
          const result = await vehiclesRes.json();
          vehiclesData = result.data || result;
        }
        if (expensesRes.ok) {
          const result = await expensesRes.json();
          expensesData = result.data || result;
        }
        if (transactionsRes.ok) {
          const result = await transactionsRes.json();
          transactionsData = result.data || result;
        }
        if (ticketsRes.ok) {
          const result = await ticketsRes.json();
          ticketsData = result.data || result;
        }
        if (employeesRes.ok) {
          const result = await employeesRes.json();
          employeesData = result.data || result;
        }
        if (investorsRes.ok) {
          const result = await investorsRes.json();
          investorsData = result.data || result;
        }
        if (investorSignupRes.ok) {
          const result = await investorSignupRes.json();
          investorSignupData = result.data || result;
        }
        if (investmentFDRes.ok) {
          const result = await investmentFDRes.json();
          investmentFDData = result.data || result;
        }

        setDrivers(driversData);
        setVehicles(vehiclesData);
        setExpenses(expensesData);
        setTransactions(transactionsData);
        setTickets(ticketsData);
        setEmployees(employeesData);
        setInvestors(investorsData);
        setInvestorSignups(investorSignupData);
        setInvestmentFDs(investmentFDData);

        // Calculate stats
        const activeDriversCount = driversData.filter(d => String(d.status || '').toLowerCase() === 'active').length;
        const activeVehiclesCount = vehiclesData.filter(v => String(v.status || '').toLowerCase() === 'active').length;
        const pendingKycCount = driversData.filter(d => d.kycStatus === 'pending').length;
        
        const totalRevenue = transactionsData
          .filter(t => t.type === 'revenue' || t.type === 'income')
          .reduce((sum, t) => sum + (t.amount || 0), 0);
        
        const totalExpenses = expensesData
          .filter(e => e.status === 'approved')
          .reduce((sum, e) => sum + (e.amount || 0), 0);

        const totalInvestmentFromInvestors = investorsData.reduce((sum, inv) => sum + (inv.totalInvestment || 0), 0);
        const totalInvestmentFromFDs = investmentFDData.reduce((sum, inv) => sum + (inv.investmentAmount || 0), 0);
        const totalInvestment = totalInvestmentFromInvestors + totalInvestmentFromFDs;
        const activeInvestors = investorsData.filter(inv => (inv.kycStatus || '').toLowerCase() === 'verified').length;
        const pendingInvestorKyc = investorsData.filter(inv => (inv.kycStatus || '').toLowerCase() === 'pending').length;
        const signupCount = investorSignupData.length;

        // Calculate system health score
        const vehicleHealth = vehiclesData.length > 0 
          ? (activeVehiclesCount / vehiclesData.length) * 100 
          : 100;
        const driverHealth = driversData.length > 0 
          ? (activeDriversCount / driversData.length) * 100 
          : 100;
        const ticketHealth = ticketsData.length > 0
          ? ((ticketsData.filter(t => t.status === 'resolved' || t.status === 'closed').length) / ticketsData.length) * 100
          : 100;
        const systemHealth = (vehicleHealth * 0.4 + driverHealth * 0.4 + ticketHealth * 0.2);

        setStats({
          totalUsers: employeesData.length,
          totalDrivers: driversData.length,
          activeDrivers: activeDriversCount,
          totalVehicles: vehiclesData.length,
          activeVehicles: activeVehiclesCount,
          totalRevenue,
          totalExpenses,
          pendingKyc: pendingKycCount,
          totalInvestors: investorsData.length,
          activeInvestors,
          pendingInvestorKyc,
          investorSignups: signupCount,
          totalInvestment,
          systemHealth: systemHealth.toFixed(1),
          lastBackup: new Date().toISOString()
        });

        // Generate system alerts
        const alerts = [];
        if (pendingKycCount > 0) {
          alerts.push({
            id: 1,
            type: 'info',
            message: `${pendingKycCount} driver${pendingKycCount > 1 ? 's' : ''} pending KYC verification`,
            priority: pendingKycCount > 20 ? 'high' : 'medium'
          });
        }

        const maintenanceVehicles = vehiclesData.filter(v => v.status === 'maintenance').length;
        if (maintenanceVehicles > 0) {
          alerts.push({
            id: 2,
            type: 'warning',
            message: `${maintenanceVehicles} vehicle${maintenanceVehicles > 1 ? 's' : ''} currently under maintenance`,
            priority: maintenanceVehicles > 10 ? 'high' : 'medium'
          });
        }

        const openTickets = ticketsData.filter(t => t.status === 'open' || t.status === 'pending').length;
        if (openTickets > 0) {
          alerts.push({
            id: 3,
            type: 'warning',
            message: `${openTickets} open ticket${openTickets > 1 ? 's' : ''} require attention`,
            priority: openTickets > 15 ? 'high' : 'medium'
          });
        }

        if (systemHealth >= 95) {
          alerts.push({
            id: 4,
            type: 'success',
            message: 'All systems operational - Excellent health',
            priority: 'low'
          });
        }

        const idleVehicles = vehiclesData.filter(v => v.status === 'idle').length;
        if (idleVehicles > 5) {
          alerts.push({
            id: 5,
            type: 'info',
            message: `${idleVehicles} idle vehicles available for assignment`,
            priority: 'low'
          });
        }

        setSystemAlerts(alerts.slice(0, 5));

        // Generate recent activities
        const activities = [];
        
        // Recent drivers
        const recentDrivers = [...driversData]
          .filter(d => d.createdAt)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 2);
        
        recentDrivers.forEach((d, idx) => {
          const timeAgo = getTimeAgo(d.createdAt);
          activities.push({
            id: `driver-${idx}`,
            type: 'driver_approved',
            message: `New driver registered: ${d.name}`,
            time: timeAgo
          });
        });

        // Recent expenses
        const recentExpenses = [...expensesData]
          .filter(e => e.date)
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 2);
        
        recentExpenses.forEach((e, idx) => {
          const timeAgo = getTimeAgo(e.date);
          activities.push({
            id: `expense-${idx}`,
            type: 'payment_processed',
            message: `Expense processed: ${e.title} - ${formatCurrency(e.amount)}`,
            time: timeAgo
          });
        });

        // Recent transactions
        const recentTransactions = [...transactionsData]
          .filter(t => t.date)
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 2);
        
        recentTransactions.forEach((t, idx) => {
          const timeAgo = getTimeAgo(t.date);
          activities.push({
            id: `transaction-${idx}`,
            type: 'payment_processed',
            message: `Transaction: ${t.type} - ${formatCurrency(t.amount)}`,
            time: timeAgo
          });
        });

        setRecentActivities(activities.slice(0, 6));

      } catch (err) {
        console.error('Error loading dashboard data:', err);
        toast.error('Failed to load dashboard data');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)} days ago`;
    return formatDate(dateString);
  };

  const calculateGrowth = (current, total) => {
    // Mock growth calculation - in real app, compare with previous period
    const growth = Math.random() * 20 - 5; // Random between -5% and 15%
    return growth;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome, {user?.name || 'Manager'}</h1>
        {/* <p className="text-green-100">Manage drivers, vehicles, and fleet operations</p> */}
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                 <User className="h-6 w-6 mb-2 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Drivers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalDrivers}</p>
      
              </div>
            </div>
          </CardContent>
        </Card>
         <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                 <User className="h-6 w-6 mb-2 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Drivers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeDrivers}</p>
                
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Car className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Vehicles</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalVehicles}</p>
        
              </div>
            </div>
          </CardContent>
          
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Car className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Vehicles</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeVehicles}</p>
    
              </div>
            </div>
          </CardContent>
          
        </Card>
      </div>

     

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Manage Users/Admin */}
            {/* {hasPermission(PERMISSIONS.ADMIN_VIEW) && (
              <button 
                onClick={() => navigate('/admin/users')}
                className="btn btn-outline flex flex-col items-center p-4 hover:bg-blue-50 transition-colors"
              >
                <Users className="h-6 w-6 mb-2 text-blue-600" />
                <span className="text-sm font-medium">Manage Users</span>
                <span className="text-xs text-gray-500 mt-1">{stats.totalUsers} users</span>
              </button>
            )} */}

            {/* Drivers */}
            {hasPermission(PERMISSIONS.DRIVERS_VIEW) && (
              <button 
                onClick={() => navigate('/drivers')}
                className="btn btn-outline flex flex-col items-center p-4 hover:text-black hover:bg-green-50 transition-colors"
              >
                 <User className="h-6 w-6 mb-2 text-green-600" />
                <span className="text-sm font-medium">All Drivers</span>
                <span className="text-xs text-gray-500 mt-1">{stats.totalDrivers} drivers</span>
              </button>
            )}

            {/* Vehicles */}
            {hasPermission(PERMISSIONS.VEHICLES_VIEW) && (
              <button 
                onClick={() => navigate('/vehicles/allvehicles')}
                className="btn btn-outline flex flex-col items-center p-4 hover:text-black hover:bg-purple-50 transition-colors"
              >
                <Car className="h-6 w-6 mb-2 text-purple-600" />
                <span className="text-sm font-medium">All Vehicles</span>
                <span className="text-xs text-gray-500 mt-1">{stats.totalVehicles} vehicles</span>
              </button>
            )}

            {/* Financial Reports */}
            {/* {hasPermission(PERMISSIONS.REPORTS_FINANCIAL) && (
              <button 
                onClick={() => navigate('/reports/financial')}
                className="btn btn-outline flex flex-col items-center p-4 hover:bg-indigo-50 transition-colors"
              >
                <DollarSign className="h-6 w-6 mb-2 text-indigo-600" />
                <span className="text-sm font-medium">Financial Reports</span>
                <span className="text-xs text-gray-500 mt-1">View analytics</span>
              </button>
            )} */}

            {/* Performance Reports */}
            {/* {hasPermission(PERMISSIONS.REPORTS_PERFORMANCE) && (
              <button 
                onClick={() => navigate('/reports/performance')}
                className="btn btn-outline flex flex-col items-center p-4 hover:bg-orange-50 transition-colors"
              >
                <BarChart3 className="h-6 w-6 mb-2 text-orange-600" />
                <span className="text-sm font-medium">Performance</span>
                <span className="text-xs text-gray-500 mt-1">KPI dashboard</span>
              </button>
            )} */}

            {/* Expenses */}
            

            {/* Investments */}
            {hasPermission(PERMISSIONS.INVESTMENTS_VIEW) && (
              <button 
                onClick={() => navigate('/investerDetails')}
                className="btn btn-outline flex flex-col items-center p-4 hover:text-black hover:bg-teal-50 transition-colors"
              >
                <Wallet className="h-6 w-6 mb-2 text-teal-600" />
                <span className="text-sm font-medium">Investments</span>
                <span className="text-xs text-gray-500 mt-1">{stats.totalInvestors} investors</span>
              </button>
            )}

            {/* Tickets */}
            {/* {hasPermission(PERMISSIONS.TICKETS_VIEW) && (
              <button 
                onClick={() => navigate('/tickets')}
                className="btn btn-outline flex flex-col items-center p-4 hover:bg-yellow-50 transition-colors"
              >
                <AlertTriangle className="h-6 w-6 mb-2 text-yellow-600" />
                <span className="text-sm font-medium">Tickets</span>
                <span className="text-xs text-gray-500 mt-1">
                  {tickets.filter(t => t.status === 'open' || t.status === 'pending').length} open
                </span>
              </button>
            )} */}

            {/* Driver KYC */}
            {/* {hasPermission(PERMISSIONS.DRIVERS_KYC) && stats.pendingKyc > 0 && (
              <button 
                onClick={() => navigate('/drivers/status')}
                className="btn btn-outline flex flex-col items-center p-4 hover:bg-pink-50 transition-colors border-pink-300"
              >
                <Shield className="h-6 w-6 mb-2 text-pink-600" />
                <span className="text-sm font-medium">Pending KYC</span>
                <span className="text-xs text-pink-600 mt-1 font-semibold">{stats.pendingKyc} pending</span>
              </button>
            )} */}

            {/* Roles Management */}
            {/* {hasPermission(PERMISSIONS.ADMIN_ROLES) && (
              <button 
                onClick={() => navigate('/admin/roles')}
                className="btn btn-outline flex flex-col items-center p-4 hover:bg-gray-50 transition-colors"
              >
                <Settings className="h-6 w-6 mb-2 text-gray-600" />
                <span className="text-sm font-medium">Manage Roles</span>
                <span className="text-xs text-gray-500 mt-1">Permissions</span>
              </button>
            )} */}
 {/* Plans */}
            {hasPermission(PERMISSIONS.PLANS_VIEW) && (
              <button 
                onClick={() => navigate('/plans')}
                className="btn btn-outline flex flex-col items-center p-4 hover:text-black hover:bg-cyan-50 transition-colors"
              >
                <Database className="h-6 w-6 mb-2 text-cyan-600" />
                <span className="text-sm font-medium">Car Plans</span>
                <span className="text-xs text-gray-500 mt-1">Manage plans</span>
              </button>
            )}
            {/* Payments */}
            {hasPermission(PERMISSIONS.PAYMENTS_VIEW) && (
              <button 
                onClick={() => navigate('/payments/drivers')}
                className="btn btn-outline flex flex-col items-center p-4 hover:text-black hover:bg-emerald-50 transition-colors"
              >
                < IndianRupee  className="h-6 w-6 mb-2 text-emerald-600" />
                <span className="text-sm font-medium">Payments</span>
                <span className="text-xs text-gray-500 mt-1">Process payments</span>
              </button>
            )}

           
            {hasPermission(PERMISSIONS.EXPENSES_VIEW) && (
              <button 
                onClick={() => navigate('/expenses')}
                className="btn btn-outline flex flex-col items-center p-4 hover:text-black hover:bg-red-50 transition-colors"
              >
                <FileText className="h-6 w-6 mb-2 text-red-600" />
                <span className="text-sm font-medium">Expenses</span>
                <span className="text-xs text-gray-500 mt-1">{formatCurrency(stats.totalExpenses)}</span>
              </button>
            )}
              {hasPermission(PERMISSIONS.ATTENDANCE_VIEW) && (
                          <button 
                            onClick={() => navigate('/attendence')}
                            className="btn btn-outline flex flex-col items-center p-4 hover:text-black hover:bg-red-50 transition-colors"
                          >
                            <CalendarCheck className="h-6 w-6 mb-2 text-blue-600" />
                            <span className="text-sm font-medium">Attendance</span>
                            <span className="text-xs text-gray-500 mt-1">Manage Attendence</span>
                          </button>
                        )}
                          {hasPermission(PERMISSIONS.HR_VIEW) && (
                          <button 
                            onClick={() => navigate('/staff')}
                            className="btn btn-outline flex flex-col items-center p-4 hover:text-black hover:bg-red-50 transition-colors"
                          >
                            <ClipboardList className="h-6 w-6 mb-2 text-blue-600" />
                            <span className="text-sm font-medium">Staff</span>
                            <span className="text-xs text-gray-500 mt-1">Manage Staff</span>
                          </button>
                        )}
          </div>
           {/* System Alerts & Recent Activities */}
      

          {/* No actions available message */}
          {!hasPermission(PERMISSIONS.ADMIN_VIEW) && 
           !hasPermission(PERMISSIONS.DRIVERS_VIEW) && 
           !hasPermission(PERMISSIONS.VEHICLES_VIEW) && 
            !hasPermission(PERMISSIONS.HR_VIEW) && 
           !hasPermission(PERMISSIONS.REPORTS_VIEW) && (
            <div className="text-center py-8 text-gray-500">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-sm">No quick actions available with your current permissions</p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}