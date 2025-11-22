import { useState, useEffect } from 'react';
import {
  TrendingDown,
  TrendingUp,
  Calendar,
  Download,
  Filter,
  DollarSign,
  PieChart,
  BarChart3,
  FileText,
  Building,
  Users,
  Car,
  Fuel,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { formatDate, formatCurrency } from '../../utils';
import { useAuth } from '../../contexts/AuthContext';
import { PermissionGuard } from '../../components/guards/PermissionGuards';
import { PERMISSIONS } from '../../utils/permissions';
import toast from 'react-hot-toast';

export default function ExpenseReports() {
  const { hasPermission } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('thisMonth');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const iconMap = {
    fuel: { icon: Fuel, color: 'text-orange-600', bg: 'bg-orange-100' },
    maintenance: { icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-100' },
    insurance: { icon: Car, color: 'text-green-600', bg: 'bg-green-100' },
    administrative: { icon: Building, color: 'text-purple-600', bg: 'bg-purple-100' },
    salary: { icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    marketing: { icon: FileText, color: 'text-pink-600', bg: 'bg-pink-100' },
    technology: { icon: FileText, color: 'text-gray-600', bg: 'bg-gray-100' },
    other: { icon: FileText, color: 'text-gray-500', bg: 'bg-gray-50' }
  };

  const [expenseCategories, setExpenseCategories] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';
        const res = await fetch(`${API_BASE}/api/expenses`);
        if (!res.ok) throw new Error(`Failed to load expenses: ${res.status}`);
        const data = await res.json();
        if (mounted) setExpenses(data);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load expenses');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';
        const res = await fetch(`${API_BASE}/api/expenses/categories`);
        if (res.ok) {
          const cats = await res.json();
          const withIcons = cats.map(c => ({
            ...c,
            icon: iconMap[c.key]?.icon || FileText,
            color: iconMap[c.key]?.color || 'text-gray-500',
            bg: iconMap[c.key]?.bg || 'bg-gray-50'
          }));
          if (mounted) setExpenseCategories(withIcons);
        }
      } catch (e) {
        // Non-fatal
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

  const filteredExpenses = expenses.filter(expense => {
    const { start, end } = getDateRange();
    const expenseDate = new Date(expense.date);
    const matchesDate = expenseDate >= start && expenseDate <= end;
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || expense.status === statusFilter;
    return matchesDate && matchesCategory && matchesStatus;
  });

  const calculateMetrics = () => {
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const approvedExpenses = filteredExpenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0);
    const pendingExpenses = filteredExpenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);
    const rejectedExpenses = filteredExpenses.filter(e => e.status === 'rejected').reduce((sum, e) => sum + e.amount, 0);

    // Previous period comparison
    const { start, end } = getDateRange();
    const periodDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - periodDays);
    const prevEnd = new Date(start);
    
    const previousPeriodExpenses = expenses.filter(e => {
      const expenseDate = new Date(e.date);
      return expenseDate >= prevStart && expenseDate < prevEnd && e.status === 'approved';
    }).reduce((sum, e) => sum + e.amount, 0);

    const changePercent = previousPeriodExpenses > 0 
      ? ((approvedExpenses - previousPeriodExpenses) / previousPeriodExpenses) * 100 
      : 0;

    // Category breakdown
    const categoryBreakdown = expenseCategories.map(category => {
      const categoryExpenses = filteredExpenses.filter(e => e.category === category.key && e.status === 'approved');
      const total = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);
      const percentage = approvedExpenses > 0 ? (total / approvedExpenses) * 100 : 0;
      const count = categoryExpenses.length;

      // Previous period for this category
      const prevCategoryExpenses = expenses.filter(e => {
        const expenseDate = new Date(e.date);
        return expenseDate >= prevStart && expenseDate < prevEnd && 
               e.category === category.key && e.status === 'approved';
      }).reduce((sum, e) => sum + e.amount, 0);

      const categoryChange = prevCategoryExpenses > 0 
        ? ((total - prevCategoryExpenses) / prevCategoryExpenses) * 100 
        : 0;

      return {
        key: category.key,
        category: category.label,
        icon: category.icon,
        color: category.color,
        bg: category.bg,
        amount: total,
        percentage,
        count,
        change: categoryChange
      };
    }).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);

    // Monthly trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() - i);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

      const monthExpenses = expenses.filter(e => {
        const expenseDate = new Date(e.date);
        return expenseDate >= monthStart && expenseDate <= monthEnd && e.status === 'approved';
      }).reduce((sum, e) => sum + e.amount, 0);

      monthlyTrend.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short' }),
        amount: monthExpenses
      });
    }

    // Top expenses
    const topExpenses = filteredExpenses
      .filter(e => e.status === 'approved')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    return {
      totalExpenses,
      approvedExpenses,
      pendingExpenses,
      rejectedExpenses,
      changePercent,
      previousPeriodExpenses,
      categoryBreakdown,
      monthlyTrend,
      topExpenses,
      count: filteredExpenses.length,
      approvedCount: filteredExpenses.filter(e => e.status === 'approved').length,
      pendingCount: filteredExpenses.filter(e => e.status === 'pending').length,
      rejectedCount: filteredExpenses.filter(e => e.status === 'rejected').length
    };
  };

  const metrics = calculateMetrics();

  const handleExport = () => {
    toast.success('Exporting report...');
    // Implement CSV/PDF export logic
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Reports & Analytics</h1>
          <p className="text-gray-600">Comprehensive expense analysis and insights</p>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="input"
              >
                <option value="all">All Categories</option>
                {expenseCategories.map(cat => (
                  <option key={cat.key} value={cat.key}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input"
              >
                <option value="all">All Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(metrics.totalExpenses)}</p>
                <p className="text-xs text-gray-500 mt-1">{metrics.count} transactions</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(metrics.approvedExpenses)}</p>
                <div className="flex items-center mt-1">
                  {metrics.changePercent >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-red-500 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-green-500 mr-1" />
                  )}
                  <span className={`text-xs font-medium ${metrics.changePercent >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {Math.abs(metrics.changePercent).toFixed(1)}% vs prev period
                  </span>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">{formatCurrency(metrics.pendingExpenses)}</p>
                <p className="text-xs text-gray-500 mt-1">{metrics.pendingCount} items</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-gray-600 mt-1">{formatCurrency(metrics.rejectedExpenses)}</p>
                <p className="text-xs text-gray-500 mt-1">{metrics.rejectedCount} items</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <PieChart className="h-5 w-5 mr-2" />
            Expense Breakdown by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.categoryBreakdown.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <div key={idx} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 ${cat.bg} rounded-lg`}>
                        <Icon className={`h-5 w-5 ${cat.color}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{cat.category}</h3>
                        <p className="text-sm text-gray-500">{cat.count} expenses</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">{formatCurrency(cat.amount)}</p>
                      <div className="flex items-center justify-end mt-1">
                        {cat.change >= 0 ? (
                          <ArrowUpRight className="h-3 w-3 text-red-500 mr-1" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 text-green-500 mr-1" />
                        )}
                        <span className={`text-xs ${cat.change >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {Math.abs(cat.change).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{cat.percentage.toFixed(1)}% of total approved</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            6-Month Expense Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.monthlyTrend.map((month, idx) => {
              const maxAmount = Math.max(...metrics.monthlyTrend.map(m => m.amount));
              const percentage = maxAmount > 0 ? (month.amount / maxAmount) * 100 : 0;
              return (
                <div key={idx} className="flex items-center space-x-4">
                  <div className="w-16 text-sm font-medium text-gray-700">{month.month}</div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 rounded-full h-8 relative">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-8 rounded-full flex items-center justify-end pr-3 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      >
                        {month.amount > 0 && (
                          <span className="text-white text-sm font-medium">
                            {formatCurrency(month.amount)}
                          </span>
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

      {/* Top 10 Expenses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Top 10 Expenses (Approved)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : metrics.topExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                      No approved expenses found for this period
                    </td>
                  </tr>
                ) : (
                  metrics.topExpenses.map((expense, idx) => (
                    <tr key={expense.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {idx + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{expense.title}</div>
                        <div className="text-sm text-gray-500">{expense.description?.substring(0, 50)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="info" className="capitalize">{expense.category}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {expense.vendor || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(expense.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                        {formatCurrency(expense.amount)}
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
