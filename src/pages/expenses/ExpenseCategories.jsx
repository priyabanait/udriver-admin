import { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  Car,
  Fuel,
  Wrench,
  Building,
  Users,
  AlertCircle,
  Package,
  Zap,
  BarChart3,
  PieChart
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { formatCurrency } from '../../utils';
import { useAuth } from '../../contexts/AuthContext';
import { PermissionGuard } from '../../components/guards/PermissionGuards';
import { PERMISSIONS } from '../../utils/permissions';
import toast from 'react-hot-toast';

export default function ExpenseCategories() {
  const { hasPermission } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);

  const iconMap = {
    fuel: { icon: Fuel, color: 'text-orange-600', bg: 'bg-orange-100', border: 'border-orange-200' },
    maintenance: { icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200' },
    insurance: { icon: Car, color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-200' },
    administrative: { icon: Building, color: 'text-purple-600', bg: 'bg-purple-100', border: 'border-purple-200' },
    salary: { icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-100', border: 'border-indigo-200' },
    marketing: { icon: FileText, color: 'text-pink-600', bg: 'bg-pink-100', border: 'border-pink-200' },
    technology: { icon: Zap, color: 'text-cyan-600', bg: 'bg-cyan-100', border: 'border-cyan-200' },
    other: { icon: Package, color: 'text-gray-600', bg: 'bg-gray-100', border: 'border-gray-200' }
  };

  const [expenseCategories, setExpenseCategories] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
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
        const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
        const res = await fetch(`${API_BASE}/api/expenses/categories`);
        if (res.ok) {
          const cats = await res.json();
          const withIcons = cats.map(c => ({
            ...c,
            icon: iconMap[c.key]?.icon || FileText,
            color: iconMap[c.key]?.color || 'text-gray-500',
            bg: iconMap[c.key]?.bg || 'bg-gray-50',
            border: iconMap[c.key]?.border || 'border-gray-200'
          }));
          if (mounted) setExpenseCategories(withIcons);
        }
      } catch (e) {
        // Non-fatal
      }
    })();
    return () => { mounted = false; };
  }, []);

  const calculateCategoryStats = () => {
    return expenseCategories.map(category => {
      // All expenses for this category
      const categoryExpenses = expenses.filter(e => e.category === category.key);
      const approvedExpenses = categoryExpenses.filter(e => e.status === 'approved');
      const pendingExpenses = categoryExpenses.filter(e => e.status === 'pending');
      
      // Calculate totals
      const totalAmount = approvedExpenses.reduce((sum, e) => sum + e.amount, 0);
      const pendingAmount = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);
      const count = categoryExpenses.length;
      const approvedCount = approvedExpenses.length;
      const pendingCount = pendingExpenses.length;

      // Calculate average
      const avgAmount = approvedCount > 0 ? totalAmount / approvedCount : 0;

      // Calculate month-over-month change
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const thisMonthExpenses = approvedExpenses.filter(e => {
        const date = new Date(e.date);
        return date >= thisMonthStart;
      }).reduce((sum, e) => sum + e.amount, 0);

      const lastMonthExpenses = approvedExpenses.filter(e => {
        const date = new Date(e.date);
        return date >= lastMonthStart && date <= lastMonthEnd;
      }).reduce((sum, e) => sum + e.amount, 0);

      const changePercent = lastMonthExpenses > 0 
        ? ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 
        : 0;

      // Find highest single expense
      const highestExpense = approvedExpenses.length > 0 
        ? Math.max(...approvedExpenses.map(e => e.amount))
        : 0;

      return {
        ...category,
        totalAmount,
        pendingAmount,
        count,
        approvedCount,
        pendingCount,
        avgAmount,
        changePercent,
        thisMonthExpenses,
        lastMonthExpenses,
        highestExpense
      };
    }).sort((a, b) => b.totalAmount - a.totalAmount);
  };

  const categoryStats = calculateCategoryStats();
  const totalApprovedExpenses = categoryStats.reduce((sum, cat) => sum + cat.totalAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Categories</h1>
          <p className="text-gray-600">Manage and analyze expense categories</p>
        </div>
        {/* <div className="mt-4 sm:mt-0 flex space-x-3">
          <PermissionGuard permission={PERMISSIONS.EXPENSES_CREATE}>
            <button className="btn btn-primary flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </button>
          </PermissionGuard>
        </div> */}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Categories</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{categoryStats.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <PieChart className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Spent</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalApprovedExpenses)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Categories</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {categoryStats.filter(c => c.count > 0).length}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {categoryStats.reduce((sum, cat) => sum + cat.pendingCount, 0)}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-sm text-gray-600">Loading categories...</p>
          </div>
        ) : categoryStats.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No categories found</p>
          </div>
        ) : (
          categoryStats.map((category, idx) => {
            const Icon = category.icon;
            const percentage = totalApprovedExpenses > 0 
              ? (category.totalAmount / totalApprovedExpenses) * 100 
              : 0;

            return (
              <Card key={idx} className={`border-2 ${category.border} hover:shadow-lg transition-all duration-200`}>
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-3 ${category.bg} rounded-xl`}>
                        <Icon className={`h-6 w-6 ${category.color}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{category.label}</h3>
                        <p className="text-sm text-gray-500 capitalize">{category.key}</p>
                      </div>
                    </div>
                    <PermissionGuard permission={PERMISSIONS.EXPENSES_EDIT}>
                      <div className="flex space-x-1">
                        <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-red-600 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </PermissionGuard>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Total Spent</p>
                      <p className="text-lg font-bold text-gray-900">{formatCurrency(category.totalAmount)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Expenses</p>
                      <p className="text-lg font-bold text-gray-900">{category.approvedCount}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Avg Amount</p>
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(category.avgAmount)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1">Highest</p>
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(category.highestExpense)}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                      <span>Share of Total</span>
                      <span className="font-semibold">{percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          category.key === 'fuel' ? 'bg-orange-500' :
                          category.key === 'maintenance' ? 'bg-blue-500' :
                          category.key === 'insurance' ? 'bg-green-500' :
                          category.key === 'administrative' ? 'bg-purple-500' :
                          category.key === 'salary' ? 'bg-indigo-500' :
                          category.key === 'marketing' ? 'bg-pink-500' :
                          category.key === 'technology' ? 'bg-cyan-500' :
                          'bg-gray-500'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Month Over Month Change */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600">This Month</div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(category.thisMonthExpenses)}
                      </span>
                      {category.changePercent !== 0 && (
                        <div className={`flex items-center ${
                          category.changePercent > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {category.changePercent > 0 ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          <span className="text-xs font-medium ml-1">
                            {Math.abs(category.changePercent).toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pending Badge */}
                  {category.pendingCount > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <Badge variant="warning" className="w-full justify-center">
                        {category.pendingCount} Pending Review
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Spent</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Expenses</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Average</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Highest</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pending</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Share</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Trend</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categoryStats.map((category, idx) => {
                  const Icon = category.icon;
                  const percentage = totalApprovedExpenses > 0 
                    ? (category.totalAmount / totalApprovedExpenses) * 100 
                    : 0;

                  return (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 ${category.bg} rounded-lg`}>
                            <Icon className={`h-5 w-5 ${category.color}`} />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{category.label}</div>
                            <div className="text-xs text-gray-500 capitalize">{category.key}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                        {formatCurrency(category.totalAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        {category.approvedCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                        {formatCurrency(category.avgAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                        {formatCurrency(category.highestExpense)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {category.pendingCount > 0 ? (
                          <Badge variant="warning">{category.pendingCount}</Badge>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                        {percentage.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {category.changePercent !== 0 ? (
                          <div className={`inline-flex items-center ${
                            category.changePercent > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {category.changePercent > 0 ? (
                              <TrendingUp className="h-4 w-4 mr-1" />
                            ) : (
                              <TrendingDown className="h-4 w-4 mr-1" />
                            )}
                            <span className="text-sm font-medium">
                              {Math.abs(category.changePercent).toFixed(1)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
