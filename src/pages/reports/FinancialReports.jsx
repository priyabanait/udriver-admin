import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Download,
  Filter,
  Users,
  Car,
  TrendingDownIcon as Expense,
  Wallet,
  PieChart,
  BarChart3,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  CreditCard,
  Target,
  AlertCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { formatDate, formatCurrency } from '../../utils';
import { useAuth } from '../../contexts/AuthContext';
import { PermissionGuard } from '../../components/guards/PermissionGuards';
import { PERMISSIONS } from '../../utils/permissions';
import toast from 'react-hot-toast';

export default function FinancialReports() {
  const { hasPermission } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('thisMonth');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Data states
  const [expenses, setExpenses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
        
        // Fetch all financial data in parallel
        const [expensesRes, driversRes, vehiclesRes, investorsRes, transactionsRes] = await Promise.all([
          fetch(`${API_BASE}/api/expenses?limit=1000`),
          fetch(`${API_BASE}/api/drivers?limit=1000`),
          fetch(`${API_BASE}/api/vehicles?limit=1000`),
          fetch(`${API_BASE}/api/investors?limit=1000`),
          fetch(`${API_BASE}/api/transactions?limit=1000`)
        ]);

        if (mounted) {
          if (expensesRes.ok) {
            const result = await expensesRes.json();
            setExpenses(result.data || result);
          }
          if (driversRes.ok) {
            const result = await driversRes.json();
            setDrivers(result.data || result);
          }
          if (vehiclesRes.ok) {
            const result = await vehiclesRes.json();
            setVehicles(result.data || result);
          }
          if (investorsRes.ok) {
            const result = await investorsRes.json();
            setInvestors(result.data || result);
          }
          if (transactionsRes.ok) {
            const result = await transactionsRes.json();
            setTransactions(result.data || result);
          }
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load financial data');
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

  const calculateFinancialMetrics = () => {
    const { start, end } = getDateRange();

    // Filter data by date range
    const filteredExpenses = expenses.filter(e => {
      const date = new Date(e.date);
      return date >= start && date <= end && e.status === 'approved';
    });

    const filteredTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      return date >= start && date <= end;
    });

    // Calculate totals
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalRevenue = filteredTransactions
      .filter(t => t.type === 'revenue' || t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const driverEarnings = drivers.reduce((sum, d) => sum + (d.totalEarnings || 0), 0);
    const driverPayments = filteredTransactions
      .filter(t => t.type === 'payment' && t.driverId)
      .reduce((sum, t) => sum + t.amount, 0);

    const investmentTotal = investors.reduce((sum, inv) => sum + (inv.totalInvestment || 0), 0);
    const investmentReturns = filteredTransactions
      .filter(t => t.type === 'investment_return')
      .reduce((sum, t) => sum + t.amount, 0);

    const vehicleMaintenance = filteredExpenses
      .filter(e => e.category === 'maintenance')
      .reduce((sum, e) => sum + e.amount, 0);

    const fuelCosts = filteredExpenses
      .filter(e => e.category === 'fuel')
      .reduce((sum, e) => sum + e.amount, 0);

    const insuranceCosts = filteredExpenses
      .filter(e => e.category === 'insurance')
      .reduce((sum, e) => sum + e.amount, 0);

    const salaryCosts = filteredExpenses
      .filter(e => e.category === 'salary')
      .reduce((sum, e) => sum + e.amount, 0);

    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Previous period comparison
    const periodDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - periodDays);
    const prevEnd = new Date(start);

    const prevExpenses = expenses.filter(e => {
      const date = new Date(e.date);
      return date >= prevStart && date < prevEnd && e.status === 'approved';
    }).reduce((sum, e) => sum + e.amount, 0);

    const prevRevenue = transactions.filter(t => {
      const date = new Date(t.date);
      return date >= prevStart && date < prevEnd && (t.type === 'revenue' || t.type === 'income');
    }).reduce((sum, t) => sum + t.amount, 0);

    const expenseChange = prevExpenses > 0 ? ((totalExpenses - prevExpenses) / prevExpenses) * 100 : 0;
    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    // Monthly trend (last 6 months)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() - i);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

      const monthExpenses = expenses.filter(e => {
        const date = new Date(e.date);
        return date >= monthStart && date <= monthEnd && e.status === 'approved';
      }).reduce((sum, e) => sum + e.amount, 0);

      const monthRevenue = transactions.filter(t => {
        const date = new Date(t.date);
        return date >= monthStart && date <= monthEnd && (t.type === 'revenue' || t.type === 'income');
      }).reduce((sum, t) => sum + t.amount, 0);

      monthlyData.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short' }),
        expenses: monthExpenses,
        revenue: monthRevenue,
        profit: monthRevenue - monthExpenses
      });
    }

    // Expense breakdown by category
    const expenseBreakdown = [
      { category: 'Fuel', amount: fuelCosts, icon: '⛽', color: 'bg-orange-500' },
      { category: 'Maintenance', amount: vehicleMaintenance, icon: '🔧', color: 'bg-blue-500' },
      { category: 'Insurance', amount: insuranceCosts, icon: '🛡️', color: 'bg-green-500' },
      { category: 'Salaries', amount: salaryCosts, icon: '👥', color: 'bg-purple-500' }
    ].sort((a, b) => b.amount - a.amount);

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      driverEarnings,
      driverPayments,
      investmentTotal,
      investmentReturns,
      vehicleMaintenance,
      fuelCosts,
      insuranceCosts,
      salaryCosts,
      expenseChange,
      revenueChange,
      monthlyData,
      expenseBreakdown,
      activeDrivers: drivers.filter(d => d.status === 'active').length,
      totalDrivers: drivers.length,
      activeVehicles: vehicles.filter(v => v.status === 'active').length,
      totalVehicles: vehicles.length,
      totalInvestors: investors.length
    };
  };

  const metrics = calculateFinancialMetrics();

  const handleExport = () => {
    toast.success('Exporting financial report...');
    // Implement export logic
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
          <p className="text-gray-600">Comprehensive financial overview and analytics</p>
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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.totalRevenue)}</p>
                <div className="flex items-center mt-2">
                  {metrics.revenueChange >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-xs font-medium ${metrics.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(metrics.revenueChange).toFixed(1)}% vs prev period
                  </span>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-red-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">Total Expenses</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.totalExpenses)}</p>
                <div className="flex items-center mt-2">
                  {metrics.expenseChange >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-red-500 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-green-500 mr-1" />
                  )}
                  <span className={`text-xs font-medium ${metrics.expenseChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {Math.abs(metrics.expenseChange).toFixed(1)}% vs prev period
                  </span>
                </div>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">Net Profit</p>
                <p className={`text-2xl font-bold ${metrics.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatCurrency(metrics.netProfit)}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Margin: {metrics.profitMargin.toFixed(1)}%
                </p>
              </div>
              <div className={`p-3 rounded-full ${metrics.netProfit >= 0 ? 'bg-blue-100' : 'bg-red-100'}`}>
                <DollarSign className={`h-6 w-6 ${metrics.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">Driver Earnings</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.driverEarnings)}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {metrics.activeDrivers} active / {metrics.totalDrivers} total
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Expense Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.expenseBreakdown.map((item, idx) => {
                const percentage = metrics.totalExpenses > 0 
                  ? (item.amount / metrics.totalExpenses) * 100 
                  : 0;
                return (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">{item.icon}</span>
                        <span className="text-sm font-medium text-gray-700">{item.category}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(item.amount)}</p>
                        <p className="text-xs text-gray-500">{percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`${item.color} h-2 rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Operational Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Operational Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Car className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Vehicle Fleet</p>
                    <p className="text-xs text-gray-500">{metrics.activeVehicles} active vehicles</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-gray-900">{metrics.totalVehicles}</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Active Drivers</p>
                    <p className="text-xs text-gray-500">Out of {metrics.totalDrivers} total</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-gray-900">{metrics.activeDrivers}</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Wallet className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Total Investment</p>
                    <p className="text-xs text-gray-500">{metrics.totalInvestors} investors</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(metrics.investmentTotal)}</p>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <CreditCard className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Driver Payments</p>
                    <p className="text-xs text-gray-500">Processed this period</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(metrics.driverPayments)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Revenue vs Expenses - 6 Month Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.monthlyData.map((month, idx) => {
              const maxValue = Math.max(
                ...metrics.monthlyData.map(m => Math.max(m.revenue, m.expenses))
              );
              const revenuePercent = maxValue > 0 ? (month.revenue / maxValue) * 100 : 0;
              const expensePercent = maxValue > 0 ? (month.expenses / maxValue) * 100 : 0;

              return (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 w-16">{month.month}</span>
                    <div className="flex-1 ml-4 space-y-2">
                      {/* Revenue Bar */}
                      <div className="relative">
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 rounded-full h-6">
                            <div
                              className="bg-gradient-to-r from-green-400 to-green-600 h-6 rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                              style={{ width: `${revenuePercent}%` }}
                            >
                              {month.revenue > 0 && (
                                <span className="text-white text-xs font-medium">
                                  {formatCurrency(month.revenue)}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="ml-2 text-xs text-gray-600 w-16">Revenue</span>
                        </div>
                      </div>

                      {/* Expense Bar */}
                      <div className="relative">
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 rounded-full h-6">
                            <div
                              className="bg-gradient-to-r from-red-400 to-red-600 h-6 rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                              style={{ width: `${expensePercent}%` }}
                            >
                              {month.expenses > 0 && (
                                <span className="text-white text-xs font-medium">
                                  {formatCurrency(month.expenses)}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="ml-2 text-xs text-gray-600 w-16">Expenses</span>
                        </div>
                      </div>
                    </div>

                    {/* Profit/Loss */}
                    <div className="ml-4 text-right w-32">
                      <Badge variant={month.profit >= 0 ? 'success' : 'danger'}>
                        {month.profit >= 0 ? '+' : ''}{formatCurrency(month.profit)}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
                <Target className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">Profit Margin</p>
              <p className="text-3xl font-bold text-gray-900">{metrics.profitMargin.toFixed(1)}%</p>
              <p className="text-xs text-gray-500 mt-2">
                {metrics.netProfit >= 0 ? 'Profitable' : 'Loss-making'} operation
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mb-3">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Transactions</p>
              <p className="text-3xl font-bold text-gray-900">{transactions.length}</p>
              <p className="text-xs text-gray-500 mt-2">All time records</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
                <AlertCircle className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-sm font-medium text-gray-600 mb-1">Investment Returns</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(metrics.investmentReturns)}</p>
              <p className="text-xs text-gray-500 mt-2">Paid to investors</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
