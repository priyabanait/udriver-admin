import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Car,
  DollarSign,
  Calendar,
  Download,
  Star,
  Award,
  Target,
  Activity,
  Zap,
  Clock,
  MapPin,
  Fuel,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Trophy,
  ThumbsUp,
  MessageSquare
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { formatDate, formatCurrency } from '../../utils';
import { useAuth } from '../../contexts/AuthContext';
import { PermissionGuard } from '../../components/guards/PermissionGuards';
import { PERMISSIONS } from '../../utils/permissions';
import toast from 'react-hot-toast';

export default function PerformanceReports() {
  const { hasPermission } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('thisMonth');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Data states
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';
        
        // Fetch all performance-related data in parallel
        const [driversRes, vehiclesRes, expensesRes, transactionsRes, ticketsRes] = await Promise.all([
          fetch(`${API_BASE}/api/drivers`),
          fetch(`${API_BASE}/api/vehicles`),
          fetch(`${API_BASE}/api/expenses`),
          fetch(`${API_BASE}/api/transactions`),
          fetch(`${API_BASE}/api/tickets`).catch(() => ({ ok: false }))
        ]);

        if (mounted) {
          if (driversRes.ok) setDrivers(await driversRes.json());
          if (vehiclesRes.ok) setVehicles(await vehiclesRes.json());
          if (expensesRes.ok) setExpenses(await expensesRes.json());
          if (transactionsRes.ok) setTransactions(await transactionsRes.json());
          if (ticketsRes.ok) setTickets(await ticketsRes.json());
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load performance data');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const getDateRange = () => {
    const now = new Date();
    let start, end;

    switch (dateRange) {
      case 'today':
        start = new Date(now.setHours(0, 0, 0, 0));
        end = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'thisWeek':
        start = new Date(now.setDate(now.getDate() - now.getDay()));
        end = new Date();
        break;
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date();
        break;
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'thisQuarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        end = new Date();
        break;
      case 'thisYear':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date();
        break;
      case 'custom':
        start = customStartDate ? new Date(customStartDate) : new Date(0);
        end = customEndDate ? new Date(customEndDate) : new Date();
        break;
      default:
        start = new Date(0);
        end = new Date();
    }

    return { start, end };
  };

  const calculatePerformanceMetrics = () => {
    const { start, end } = getDateRange();

    // Driver Performance
    const activeDrivers = drivers.filter(d => d.status === 'active');
    const totalDrivers = drivers.length;
    const driverUtilization = totalDrivers > 0 ? (activeDrivers.length / totalDrivers) * 100 : 0;

    const totalEarnings = drivers.reduce((sum, d) => sum + (d.totalEarnings || 0), 0);
    const avgEarningsPerDriver = activeDrivers.length > 0 ? totalEarnings / activeDrivers.length : 0;

    const topDrivers = [...drivers]
      .sort((a, b) => (b.totalEarnings || 0) - (a.totalEarnings || 0))
      .slice(0, 10)
      .map(d => ({
        id: d.id,
        name: d.name,
        earnings: d.totalEarnings || 0,
        trips: d.totalTrips || 0,
        rating: d.rating || 0,
        status: d.status
      }));

    // Vehicle Performance
    const activeVehicles = vehicles.filter(v => v.status === 'active');
    const totalVehicles = vehicles.length;
    const vehicleUtilization = totalVehicles > 0 ? (activeVehicles.length / totalVehicles) * 100 : 0;

    const vehiclesUnderMaintenance = vehicles.filter(v => v.status === 'maintenance').length;
    const vehiclesIdle = vehicles.filter(v => v.status === 'idle').length;

    const vehicleExpenses = expenses.filter(e => 
      e.vehicleId && 
      new Date(e.date) >= start && 
      new Date(e.date) <= end &&
      e.status === 'approved'
    );

    const avgMaintenanceCost = activeVehicles.length > 0 
      ? vehicleExpenses.reduce((sum, e) => sum + e.amount, 0) / activeVehicles.length
      : 0;

    // Revenue & Efficiency
    const periodRevenue = transactions.filter(t => {
      const date = new Date(t.date);
      return date >= start && date <= end && (t.type === 'revenue' || t.type === 'income');
    }).reduce((sum, t) => sum + t.amount, 0);

    const periodExpenses = expenses.filter(e => {
      const date = new Date(e.date);
      return date >= start && date <= end && e.status === 'approved';
    }).reduce((sum, e) => sum + e.amount, 0);

    const efficiency = periodRevenue > 0 ? ((periodRevenue - periodExpenses) / periodRevenue) * 100 : 0;

    // Previous period comparison
    const periodDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - periodDays);
    const prevEnd = new Date(start);

    const prevRevenue = transactions.filter(t => {
      const date = new Date(t.date);
      return date >= prevStart && date < prevEnd && (t.type === 'revenue' || t.type === 'income');
    }).reduce((sum, t) => sum + t.amount, 0);

    const revenueGrowth = prevRevenue > 0 ? ((periodRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    // Ticket/Issue Resolution
    const totalTickets = tickets.length;
    const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
    const pendingTickets = tickets.filter(t => t.status === 'open' || t.status === 'pending').length;
    const resolutionRate = totalTickets > 0 ? (resolvedTickets / totalTickets) * 100 : 0;

    // Fleet Health Score (0-100)
    const fleetHealthScore = (
      (vehicleUtilization * 0.3) + 
      (Math.max(0, 100 - (vehiclesUnderMaintenance / totalVehicles * 100)) * 0.3) +
      (driverUtilization * 0.2) +
      (resolutionRate * 0.2)
    );

    // Performance by Category
    const performanceByCategory = {
      excellent: drivers.filter(d => (d.rating || 0) >= 4.5).length,
      good: drivers.filter(d => (d.rating || 0) >= 3.5 && (d.rating || 0) < 4.5).length,
      average: drivers.filter(d => (d.rating || 0) >= 2.5 && (d.rating || 0) < 3.5).length,
      poor: drivers.filter(d => (d.rating || 0) < 2.5 && (d.rating || 0) > 0).length,
      unrated: drivers.filter(d => !d.rating || d.rating === 0).length
    };

    // Monthly trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() - i);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

      const monthRevenue = transactions.filter(t => {
        const date = new Date(t.date);
        return date >= monthStart && date <= monthEnd && (t.type === 'revenue' || t.type === 'income');
      }).reduce((sum, t) => sum + t.amount, 0);

      const monthExpenses = expenses.filter(e => {
        const date = new Date(e.date);
        return date >= monthStart && date <= monthEnd && e.status === 'approved';
      }).reduce((sum, e) => sum + e.amount, 0);

      const monthActiveDrivers = drivers.filter(d => {
        if (!d.joinDate) return false;
        const joinDate = new Date(d.joinDate);
        return joinDate <= monthEnd && d.status === 'active';
      }).length;

      monthlyTrend.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short' }),
        revenue: monthRevenue,
        expenses: monthExpenses,
        activeDrivers: monthActiveDrivers,
        efficiency: monthRevenue > 0 ? ((monthRevenue - monthExpenses) / monthRevenue) * 100 : 0
      });
    }

    return {
      // Driver Metrics
      activeDrivers: activeDrivers.length,
      totalDrivers,
      driverUtilization,
      avgEarningsPerDriver,
      topDrivers,
      
      // Vehicle Metrics
      activeVehicles: activeVehicles.length,
      totalVehicles,
      vehicleUtilization,
      vehiclesUnderMaintenance,
      vehiclesIdle,
      avgMaintenanceCost,
      
      // Financial Metrics
      periodRevenue,
      periodExpenses,
      efficiency,
      revenueGrowth,
      
      // Service Metrics
      totalTickets,
      resolvedTickets,
      pendingTickets,
      resolutionRate,
      
      // Overall Scores
      fleetHealthScore,
      performanceByCategory,
      monthlyTrend
    };
  };

  const metrics = calculatePerformanceMetrics();

  const handleExport = () => {
    toast.success('Exporting performance report...');
    // Implement export logic
  };

  const getHealthScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getHealthScoreBg = (score) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    if (score >= 40) return 'bg-orange-100';
    return 'bg-red-100';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Performance Reports</h1>
          <p className="text-gray-600">Comprehensive performance analytics and KPIs</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <PermissionGuard permission={PERMISSIONS.REPORTS_EXPORT}>
            <button onClick={handleExport} className="btn btn-outline flex items-center">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </button>
          </PermissionGuard>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="input"
              >
                <option value="today">Today</option>
                <option value="thisWeek">This Week</option>
                <option value="thisMonth">This Month</option>
                <option value="lastMonth">Last Month</option>
                <option value="thisQuarter">This Quarter</option>
                <option value="thisYear">This Year</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {dateRange === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="input"
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fleet Health Score */}
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardContent className="p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center mb-4">
              <Trophy className="h-8 w-8 text-blue-600 mr-3" />
              <h2 className="text-2xl font-bold text-gray-900">Overall Fleet Health Score</h2>
            </div>
            <div className={`text-6xl font-bold mb-2 ${getHealthScoreColor(metrics.fleetHealthScore)}`}>
              {metrics.fleetHealthScore.toFixed(1)}
              <span className="text-3xl text-gray-400">/100</span>
            </div>
            <p className="text-gray-600">
              {metrics.fleetHealthScore >= 80 ? 'Excellent Performance' :
               metrics.fleetHealthScore >= 60 ? 'Good Performance' :
               metrics.fleetHealthScore >= 40 ? 'Average Performance' :
               'Needs Improvement'}
            </p>
            <div className="mt-6 max-w-3xl mx-auto">
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className={`h-4 rounded-full transition-all duration-1000 ${
                    metrics.fleetHealthScore >= 80 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                    metrics.fleetHealthScore >= 60 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                    metrics.fleetHealthScore >= 40 ? 'bg-gradient-to-r from-orange-400 to-orange-600' :
                    'bg-gradient-to-r from-red-400 to-red-600'
                  }`}
                  style={{ width: `${metrics.fleetHealthScore}%` }}
                ></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">Driver Utilization</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.driverUtilization.toFixed(1)}%</p>
                <p className="text-xs text-gray-500 mt-2">
                  {metrics.activeDrivers} / {metrics.totalDrivers} active
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">Vehicle Utilization</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.vehicleUtilization.toFixed(1)}%</p>
                <p className="text-xs text-gray-500 mt-2">
                  {metrics.activeVehicles} / {metrics.totalVehicles} active
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Car className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">Operational Efficiency</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.efficiency.toFixed(1)}%</p>
                <div className="flex items-center mt-2">
                  {metrics.revenueGrowth >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-xs font-medium ${metrics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(metrics.revenueGrowth).toFixed(1)}% revenue growth
                  </span>
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">Issue Resolution</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.resolutionRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500 mt-2">
                  {metrics.resolvedTickets} / {metrics.totalTickets} resolved
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Driver Performance Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="h-5 w-5 mr-2" />
              Driver Performance Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">Excellent (4.5+)</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{metrics.performanceByCategory.excellent}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${metrics.totalDrivers > 0 ? (metrics.performanceByCategory.excellent / metrics.totalDrivers) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">Good (3.5-4.4)</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{metrics.performanceByCategory.good}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${metrics.totalDrivers > 0 ? (metrics.performanceByCategory.good / metrics.totalDrivers) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">Average (2.5-3.4)</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{metrics.performanceByCategory.average}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${metrics.totalDrivers > 0 ? (metrics.performanceByCategory.average / metrics.totalDrivers) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">Poor (&lt;2.5)</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{metrics.performanceByCategory.poor}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${metrics.totalDrivers > 0 ? (metrics.performanceByCategory.poor / metrics.totalDrivers) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-700">Unrated</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{metrics.performanceByCategory.unrated}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gray-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${metrics.totalDrivers > 0 ? (metrics.performanceByCategory.unrated / metrics.totalDrivers) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fleet Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Fleet Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Active Vehicles</p>
                    <p className="text-xs text-gray-500">Currently operational</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-green-600">{metrics.activeVehicles}</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <AlertTriangle className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Under Maintenance</p>
                    <p className="text-xs text-gray-500">Scheduled repairs</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-yellow-600">{metrics.vehiclesUnderMaintenance}</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Clock className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Idle Vehicles</p>
                    <p className="text-xs text-gray-500">Not assigned</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-600">{metrics.vehiclesIdle}</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Avg Maintenance Cost</p>
                    <p className="text-xs text-gray-500">Per vehicle</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(metrics.avgMaintenanceCost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            6-Month Performance Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.monthlyTrend.map((month, idx) => {
              const maxValue = Math.max(...metrics.monthlyTrend.map(m => Math.max(m.revenue, m.expenses)));
              const revenuePercent = maxValue > 0 ? (month.revenue / maxValue) * 100 : 0;
              const expensePercent = maxValue > 0 ? (month.expenses / maxValue) * 100 : 0;

              return (
                <div key={idx} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-bold text-gray-700 w-12">{month.month}</span>
                      <div className="flex items-center space-x-3">
                        <Badge variant={month.efficiency >= 60 ? 'success' : month.efficiency >= 40 ? 'warning' : 'danger'}>
                          {month.efficiency.toFixed(1)}% Efficiency
                        </Badge>
                        <div className="flex items-center text-xs text-gray-600">
                          <Users className="h-3 w-3 mr-1" />
                          {month.activeDrivers} drivers
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Net Performance</p>
                      <p className={`text-sm font-bold ${month.revenue - month.expenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(month.revenue - month.expenses)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="relative">
                      <div className="flex items-center">
                        <span className="text-xs text-gray-600 w-20">Revenue</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-5">
                          <div
                            className="bg-gradient-to-r from-green-400 to-green-600 h-5 rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                            style={{ width: `${revenuePercent}%` }}
                          >
                            {month.revenue > 0 && revenuePercent > 15 && (
                              <span className="text-white text-xs font-medium">
                                {formatCurrency(month.revenue)}
                              </span>
                            )}
                          </div>
                        </div>
                        {revenuePercent <= 15 && month.revenue > 0 && (
                          <span className="ml-2 text-xs text-gray-600">{formatCurrency(month.revenue)}</span>
                        )}
                      </div>
                    </div>

                    <div className="relative">
                      <div className="flex items-center">
                        <span className="text-xs text-gray-600 w-20">Expenses</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-5">
                          <div
                            className="bg-gradient-to-r from-red-400 to-red-600 h-5 rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                            style={{ width: `${expensePercent}%` }}
                          >
                            {month.expenses > 0 && expensePercent > 15 && (
                              <span className="text-white text-xs font-medium">
                                {formatCurrency(month.expenses)}
                              </span>
                            )}
                          </div>
                        </div>
                        {expensePercent <= 15 && month.expenses > 0 && (
                          <span className="ml-2 text-xs text-gray-600">{formatCurrency(month.expenses)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
            Top Performing Drivers
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Driver</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Earnings</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Trips</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Rating</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {metrics.topDrivers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      No driver data available
                    </td>
                  </tr>
                ) : (
                  metrics.topDrivers.map((driver, idx) => (
                    <tr key={driver.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {idx < 3 ? (
                            <Trophy className={`h-5 w-5 ${
                              idx === 0 ? 'text-yellow-500' :
                              idx === 1 ? 'text-gray-400' :
                              'text-orange-600'
                            }`} />
                          ) : (
                            <span className="text-sm font-medium text-gray-700">#{idx + 1}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{driver.name}</div>
                        <div className="text-xs text-gray-500">ID: {driver.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-green-600">
                        {formatCurrency(driver.earnings)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        {driver.trips || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-sm font-medium text-gray-900">
                            {driver.rating ? driver.rating.toFixed(1) : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <Badge variant={
                          driver.status === 'active' ? 'success' :
                          driver.status === 'inactive' ? 'secondary' :
                          'warning'
                        }>
                          {driver.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
