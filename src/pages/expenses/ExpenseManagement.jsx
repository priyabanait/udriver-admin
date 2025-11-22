import { useState, useEffect } from 'react';
import { 
  Receipt, 
  DollarSign, 
  TrendingDown, 
  PieChart, 
  Plus,
  Eye,
  Edit,
  Trash2,
  Download,
  Search,
  Filter,
  Calendar,
  FileText,
  Car,
  Fuel,
  Wrench,
  Building,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { formatDate, formatCurrency } from '../../utils';
import { useAuth } from '../../contexts/AuthContext';
import { PermissionGuard } from '../../components/guards/PermissionGuards';
import { PERMISSIONS } from '../../utils/permissions';
import toast from 'react-hot-toast';
import ExpenseModal from '../../components/expenses/ExpenseModal';

export default function ExpenseManagement() {
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateRange, setDateRange] = useState('thisMonth');
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true); setError(null);
      try {
        const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';
        const res = await fetch(`${API_BASE}/api/expenses`);
        if (!res.ok) throw new Error(`Failed to load expenses: ${res.status}`);
        const data = await res.json();
        if (mounted) setExpenses(data);
      } catch (err) {
        console.error(err); setError(err.message || 'Failed to load expenses');
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  const iconMap = {
    fuel: { icon: Fuel, color: 'text-orange-600' },
    maintenance: { icon: Wrench, color: 'text-blue-600' },
    insurance: { icon: Car, color: 'text-green-600' },
    administrative: { icon: Building, color: 'text-purple-600' },
    salary: { icon: Users, color: 'text-indigo-600' },
    marketing: { icon: FileText, color: 'text-pink-600' },
    technology: { icon: FileText, color: 'text-gray-600' },
    other: { icon: FileText, color: 'text-gray-500' }
  };
  const [expenseCategories, setExpenseCategories] = useState([]);

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
            color: iconMap[c.key]?.color || 'text-gray-500'
          }));
          if (mounted) setExpenseCategories(withIcons);
        }
      } catch (e) {
        // Non-fatal; keep default empty and rely on keys only
      }
    })();
    return () => { mounted = false; };
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <Badge variant="success" className="flex items-center"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'pending':
        return <Badge variant="warning" className="flex items-center"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'rejected':
        return <Badge variant="danger" className="flex items-center"><AlertTriangle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'processing':
        return <Badge variant="info" className="flex items-center"><Clock className="h-3 w-3 mr-1" />Processing</Badge>;
      default:
        return <Badge variant="info">{status}</Badge>;
    }
  };

  const getCategoryIcon = (category) => {
    const cat = expenseCategories.find(c => c.key === category);
    if (cat) {
      const Icon = cat.icon;
      return <Icon className={`h-5 w-5 ${cat.color}`} />;
    }
    return <FileText className="h-5 w-5 text-gray-500" />;
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || expense.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const calculateMetrics = () => {
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const approvedExpenses = expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0);
    const pendingExpenses = expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);
    const rejectedExpenses = expenses.filter(e => e.status === 'rejected').reduce((sum, e) => sum + e.amount, 0);
    
    const categoryBreakdown = expenseCategories.map(category => {
      const categoryExpenses = expenses.filter(e => e.category === category.key && e.status === 'approved');
      const total = categoryExpenses.reduce((sum, e) => sum + e.amount, 0);
      const percentage = approvedExpenses > 0 ? (total / approvedExpenses) * 100 : 0;
      
      return {
        category: category.label,
        amount: total,
        percentage,
        count: categoryExpenses.length
      };
    }).filter(c => c.amount > 0);

    return {
      totalExpenses,
      approvedExpenses,
      pendingExpenses,
      rejectedExpenses,
      categoryBreakdown,
      pendingCount: expenses.filter(e => e.status === 'pending').length,
      rejectedCount: expenses.filter(e => e.status === 'rejected').length
    };
  };

  const metrics = calculateMetrics();

  const handleExpenseAction = async (expenseId, action) => {
    if (!hasPermission(PERMISSIONS.EXPENSES_EDIT)) return;
    try {
      const expense = expenses.find(e => e.id === expenseId);
      if (!expense) throw new Error('Expense not found locally');
      let update = {};
      switch(action) {
        case 'approve':
          update = { status: 'approved', approvedBy: 'Current User', approvedDate: new Date().toISOString().split('T')[0] }; break;
        case 'reject':
          update = { status: 'rejected', approvedBy: null, approvedDate: null }; break;
        case 'pending':
          update = { status: 'pending', approvedBy: null, approvedDate: null }; break;
        default:
          return;
      }
      const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';
      const token = localStorage.getItem('udriver_token');
      const res = await fetch(`${API_BASE}/api/expenses/${expenseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token?{ Authorization: `Bearer ${token}`}: {}) },
        body: JSON.stringify(update)
      });
      if (!res.ok) throw new Error(`Failed to update expense: ${res.status}`);
      const updated = await res.json();
      setExpenses(prev => prev.map(e => e.id === expenseId ? updated : e));
      toast.success(`Expense ${action}d successfully`);
    } catch(err) {
      console.error(err); toast.error(err.message || 'Action failed');
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!hasPermission(PERMISSIONS.EXPENSES_DELETE)) return;
    if (!window.confirm('Delete this expense?')) return;
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';
      const token = localStorage.getItem('udriver_token');
      const res = await fetch(`${API_BASE}/api/expenses/${expenseId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error(`Failed to delete: ${res.status}`);
      setExpenses(prev => prev.filter(e => e.id !== expenseId));
      toast.success('Expense deleted');
    } catch(err) {
      console.error(err); toast.error(err.message || 'Delete failed');
    }
  };

  const handleCreateExpense = () => {
    setSelectedExpense(null);
    setShowExpenseModal(true);
  };

  const handleSaveExpense = async (expenseData) => {
    const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';
    const token = localStorage.getItem('udriver_token');
    
    if (selectedExpense) {
      // Update existing expense
      const res = await fetch(`${API_BASE}/api/expenses/${selectedExpense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token?{ Authorization: `Bearer ${token}` }: {}) },
        body: JSON.stringify(expenseData)
      });
      if (!res.ok) {
        let msg = `Failed to update expense: ${res.status}`;
        try { const b = await res.json(); if (b?.message) msg = b.message; } catch {}
        throw new Error(msg);
      }
      const updated = await res.json();
      setExpenses(prev => prev.map(e => e.id === selectedExpense.id ? updated : e));
    } else {
      // Create new expense
      const res = await fetch(`${API_BASE}/api/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token?{ Authorization: `Bearer ${token}` }: {}) },
        body: JSON.stringify(expenseData)
      });
      if (!res.ok) {
        let msg = `Failed to create expense: ${res.status}`;
        try { const b = await res.json(); if (b?.message) msg = b.message; } catch {}
        throw new Error(msg);
      }
      const created = await res.json();
      setExpenses(prev => [...prev, created]);
    }
  };

  const handleEditExpense = (expense) => {
    setSelectedExpense(expense);
    setShowExpenseModal(true);
  };

  const handleChangeExpenseStatus = async (expenseId, newStatus) => {
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';
      const token = localStorage.getItem('udriver_token');
      const update = { status: newStatus };
      if (newStatus === 'approved') {
        update.approvedBy = 'Current User';
        update.approvedDate = new Date().toISOString().split('T')[0];
      } else {
        update.approvedBy = null;
        update.approvedDate = null;
      }
      const res = await fetch(`${API_BASE}/api/expenses/${expenseId}`, {
        method: 'PUT',
        headers: { 'Content-Type':'application/json', ...(token?{ 'Authorization': `Bearer ${token}` }: {}) },
        body: JSON.stringify(update)
      });
      if (!res.ok) {
        let msg = `Failed to update status: ${res.status}`;
        try { const b = await res.json(); if (b && b.message) msg = b.message; } catch { /* ignore */ }
        throw new Error(msg);
      }
      const updated = await res.json();
      setExpenses(prev => prev.map(e => e.id === expenseId ? updated : e));
      toast.success('Expense status updated');
    } catch(err) {
      console.error(err);
      toast.error(err.message || 'Failed to update status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Management</h1>
          <p className="text-gray-600">Track and manage operational expenses and financial reports</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <PermissionGuard permission={PERMISSIONS.EXPENSES_CREATE}>
            <button 
              onClick={handleCreateExpense}
              className="btn btn-primary flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </button>
          </PermissionGuard>
          <PermissionGuard permission={PERMISSIONS.REPORTS_EXPORT}>
            <button className="btn btn-outline flex items-center">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </button>
          </PermissionGuard>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(metrics.totalExpenses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Approved Expenses</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(metrics.approvedExpenses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-yellow-600">{metrics.pendingCount}</p>
                <p className="text-xs text-gray-500">{formatCurrency(metrics.pendingExpenses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Rejected</p>
                <p className="text-2xl font-bold text-gray-600">{metrics.rejectedCount}</p>
                <p className="text-xs text-gray-500">{formatCurrency(metrics.rejectedExpenses)}</p>
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
            Expense Categories (Approved)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.categoryBreakdown.map((category, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{category.category}</h3>
                  <span className="text-sm text-gray-500">{category.count} items</span>
                </div>
                <div className="space-y-2">
                  <div className="text-xl font-bold text-gray-900">{formatCurrency(category.amount)}</div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${Math.min(category.percentage, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">{category.percentage.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative w-full max-w-sm">
  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
  <input
    type="text"
    placeholder="Search expenses..."
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-700"
  />
</div>

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
                <option value="processing">Processing</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="input"
              >
                <option value="all">All Categories</option>
                {expenseCategories.map(category => (
                  <option key={category.key} value={category.key}>{category.label}</option>
                ))}
              </select>
            </div>

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
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {/* <div className="flex items-end">
              <button className="btn btn-outline w-full">
                <Filter className="h-4 w-4 mr-2" />
                Apply Filters
              </button>
            </div> */}
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Records ({filteredExpenses.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading && (
            <div className="p-4 text-center text-sm text-gray-600">Loading expenses...</div>
          )}
          {error && (
            <div className="p-4 text-center text-sm text-red-600">{error}</div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expense Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vehicle/Driver
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          {getCategoryIcon(expense.category)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{expense.title}</div>
                          <div className="text-sm text-gray-500">{expense.description}</div>
                          {expense.invoiceNumber && (
                            <div className="text-xs text-gray-400">Invoice: {expense.invoiceNumber}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 capitalize">{expense.category}</div>
                      <div className="text-sm text-gray-500">{expense.subcategory}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{formatCurrency(expense.amount)}</div>
                      <div className="text-sm text-gray-500 capitalize">{expense.paymentMethod}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expense.vendor}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {expense.vehicleId && expense.vehicleId !== 'Multiple' && expense.vehicleId !== 'Fleet' 
                          ? expense.vehicleId 
                          : expense.vehicleId}
                      </div>
                      {expense.driverName && (
                        <div className="text-sm text-gray-500">{expense.driverName}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(expense.status)}
                      {expense.approvedBy && (
                        <div className="text-xs text-gray-500 mt-1">
                          By: {expense.approvedBy}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(expense.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-start text-sm space-x-2 font-medium">
                      {/* <div className="flex items-center justify-start "> */}
                        <PermissionGuard permission={PERMISSIONS.EXPENSES_EDIT}>
                          <select
                            value={expense.status || 'pending'}
                            onChange={(e) => handleChangeExpenseStatus(expense.id, e.target.value)}
                           className="input text-sm h-10 leading-6 text-center"
                          >
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="processing">Processing</option>
                          </select>
                        </PermissionGuard>
                        
                        {/* <button
                          className="text-indigo-600 hover:text-indigo-900"
                          title="View Details"
                          onClick={async () => {
                            try {
                              const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';
                              const res = await fetch(`${API_BASE}/api/expenses/${expense.id}`);
                              if (!res.ok) throw new Error('Failed to fetch expense');
                              const full = await res.json();
                              setSelectedExpense(full);
                              toast.success('Loaded expense details');
                            } catch(err) { toast.error(err.message || 'Failed to load'); }
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </button> */}
                        
                        <PermissionGuard permission={PERMISSIONS.EXPENSES_EDIT}>
                          <button
                            className="text-green-600 hover:text-green-900"
                            title="Edit Expense"
                            onClick={() => handleEditExpense(expense)}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </PermissionGuard>
                        
                        {expense.receiptUrl && (
                          <button
                            className="text-blue-600 hover:text-blue-900"
                            title="Download Receipt"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        )}
                        
                        <PermissionGuard permission={PERMISSIONS.EXPENSES_DELETE}>
                          <button
                            className="text-red-600 hover:text-red-900"
                            title="Delete Expense"
                            onClick={() => handleDeleteExpense(expense.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </PermissionGuard>
                      
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      <ExpenseModal
        isOpen={showExpenseModal}
        onClose={() => { setShowExpenseModal(false); setSelectedExpense(null); }}
        onSave={handleSaveExpense}
        expense={selectedExpense}
        categories={expenseCategories}
      />
    </div>
  );
}

// Mount ExpenseModal at bottom
// Note: We place it outside to keep return above clean; React allows fragments

