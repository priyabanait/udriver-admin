import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  IndianRupee,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  Download,
  Plus,
  RefreshCw,
  Calendar,
  Wallet,
  TrendingUp,
  Users,
  Trash2,
  Send
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { processZwitchPayout } from '../../utils/zwitchPayment';

export default function DriverPayments() {
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('week');
  const [selectedPayments, setSelectedPayments] = useState(new Set());
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showNewPayment, setShowNewPayment] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [selectedManager, setSelectedManager] = useState('');
  const [processingPayment, setProcessingPayment] = useState(null);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [selectedPaymentForProcessing, setSelectedPaymentForProcessing] = useState(null);
  const [newPayment, setNewPayment] = useState({
    driverId: '',
    amount: '',
    type: 'weekly_payout',
    status: 'completed',
    method: 'bank_transfer',
    date: new Date().toISOString().slice(0,10),
    description: ''
  });

  // Fetch payments (uses /api/transactions; falls back to driver-derived if empty)
  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';
        // Load drivers for selector
        const dRes = await fetch(`${API_BASE}/api/drivers?limit=1000`);
        if (!dRes.ok) throw new Error(`Failed to load drivers: ${dRes.status}`);
        const dResult = await dRes.json();
        const dList = dResult.data || dResult;
        if (!mounted) return;
        setDrivers(dList);

        // Load managers for dropdown
        const mRes = await fetch(`${API_BASE}/api/managers?limit=1000`);
        if (mRes.ok) {
          const mResult = await mRes.json();
          const mList = mResult.data || mResult;
          setManagers(Array.isArray(mList) ? mList : []);
        }

        // Manager filter logic
        let paymentsData = [];
        if (selectedManager) {
          const pRes = await fetch(`${API_BASE}/api/driver-plan-selections/by-manager/${encodeURIComponent(selectedManager)}?limit=1000`);
          if (!pRes.ok) throw new Error(`Failed to load payments for manager: ${pRes.status}`);
          const pResult = await pRes.json();
          paymentsData = pResult.data || pResult;
        } else {
          // Load all payments if no manager selected
          const pRes = await fetch(`${API_BASE}/api/driver-plan-selections?limit=1000`);
          if (!pRes.ok) throw new Error(`Failed to load payments: ${pRes.status}`);
          const pResult = await pRes.json();
          paymentsData = pResult.data || pResult;
        }
        if (!mounted) return;
        // Map payments to UI format
        const mapped = paymentsData.map((t) => {
          return {
            id: t._id,
            driverId: t.driverSignupId,
            driverName: t.driverUsername || 'Unknown',
            amount: t.paidAmount || 0,
            type: t.planType || 'weekly_payout',
            status: t.paymentStatus || 'pending',
            date: t.paymentDate || t.selectedDate || new Date().toISOString(),
            method: t.paymentMode || 'N/A',
            accountNumber: '****0000',
            transactionId: null,
            trips: 0,
            commission: 0,
            bonus: 0,
            deductions: 0,
            netAmount: t.paidAmount || 0,
            paymentPeriod: t.planName || 'N/A'
          };
        });
        setPayments(mapped);
      } catch (err) {
        if (!mounted) return;
        setError(err.message || 'Failed to load data');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    return () => { mounted = false; };
  }, [selectedManager]);

  // Filter payments
  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate summary statistics
  const paymentSummary = {
    totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
    completedPayments: payments.filter(p => p.status === 'completed').length,
    pendingPayments: payments.filter(p => p.status === 'pending').length,
    failedPayments: payments.filter(p => p.status === 'failed').length,
    totalDrivers: new Set(payments.map(p => p.driverId)).size
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      completed: 'success',
      pending: 'warning',
      processing: 'primary',
      failed: 'destructive'
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getPaymentTypeLabel = (type) => {
    const types = {
      weekly_payout: 'Weekly Payout',
      bonus_payment: 'Bonus Payment',
      incentive: 'Incentive',
      refund: 'Refund',
      adjustment: 'Adjustment'
    };
    return types[type] || type;
  };

  const formatCurrency = (amount) => {
    return `₹${amount.toLocaleString()}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // actions (approve/retry) removed from UI; keeping placeholder for future use

  const handleProcessPayment = async (payment) => {
    if (!hasPermission('payments.process')) {
      alert('You do not have permission to process payments');
      return;
    }

    // Get driver details for bank info
    const driver = drivers.find(d => d.id === payment.driverId);
    if (!driver) {
      alert('Driver not found');
      return;
    }

    setSelectedPaymentForProcessing({ ...payment, driver });
    setShowProcessModal(true);
  };

  const executePayment = async (bankDetails) => {
    setProcessingPayment(selectedPaymentForProcessing.id);
    try {
      const result = await processZwitchPayout({
        driverId: selectedPaymentForProcessing.driverId,
        amount: selectedPaymentForProcessing.amount,
        accountNumber: bankDetails.accountNumber,
        ifsc: bankDetails.ifsc,
        accountHolderName: bankDetails.accountHolderName,
        purpose: `Driver Payment - ${selectedPaymentForProcessing.type}`,
        paymentId: selectedPaymentForProcessing.txId
      });

      if (result.success) {
        // Update payment status in UI
        setPayments(prev => prev.map(p => 
          p.id === selectedPaymentForProcessing.id 
            ? { 
                ...p, 
                status: 'completed',
                transactionId: result.data.zwitchTransactionId,
                method: 'bank_transfer'
              }
            : p
        ));
        alert('Payment processed successfully!');
        setShowProcessModal(false);
        setSelectedPaymentForProcessing(null);
      } else {
        throw new Error(result.message || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      alert(`Payment failed: ${error.message}`);
      // Update payment status to failed
      setPayments(prev => prev.map(p => 
        p.id === selectedPaymentForProcessing.id 
          ? { ...p, status: 'failed', failureReason: error.message }
          : p
      ));
    } finally {
      setProcessingPayment(null);
    }
  };

  const handleBulkAction = (action) => {
    if (!hasPermission('payments.process') || selectedPayments.size === 0) return;
    
    console.log(`${action} ${selectedPayments.size} payments`);
    setSelectedPayments(new Set());
  };

  const togglePaymentSelection = (paymentId) => {
    const newSelection = new Set(selectedPayments);
    if (newSelection.has(paymentId)) {
      newSelection.delete(paymentId);
    } else {
      newSelection.add(paymentId);
    }
    setSelectedPayments(newSelection);
  };

  const selectAllPayments = () => {
    const allPaymentIds = new Set(filteredPayments.map(p => p.id));
    setSelectedPayments(selectedPayments.size === filteredPayments.length ? new Set() : allPaymentIds);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Driver Payments</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage driver payouts, bonuses, and payment processing
          </p>
        </div>
        <div className="mt-4 lg:mt-0 flex space-x-3">
          {hasPermission('payments.create') && (
            <button className="btn btn-outline" onClick={() => setShowNewPayment(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Payment
            </button>
          )}
          {hasPermission('payments.export') && (
            <button className="btn btn-outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          )}
          <button className="btn btn-primary" onClick={async () => {
            try {
              const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';
              setLoading(true);
              setError(null);
              // re-fetch drivers and transactions
              const [dRes, tRes] = await Promise.all([
                fetch(`${API_BASE}/api/drivers?limit=1000`),
                fetch(`${API_BASE}/api/transactions?include=summary&limit=1000`)
              ]);
              if (!dRes.ok) throw new Error(`Failed to load drivers: ${dRes.status}`);
              if (!tRes.ok) throw new Error(`Failed to load payments: ${tRes.status}`);
              const [dResult, txData] = await Promise.all([dRes.json(), tRes.json()]);
              const dList = dResult.data || dResult;
              setDrivers(dList);
              
              const tx = txData.data || txData.transactions || txData;
              if (tx && tx.length > 0) {
                const mapped = tx.map((t) => {
                  const drv = dList.find(dr => dr.id === t.driverId);
                  return {
                    id: t.id ? `PAY${String(1000 + t.id).slice(1)}` : (t.id || t._id),
                    driverId: t.driverId,
                    driverName: drv?.name || 'Unknown',
                    amount: t.amount || 0,
                    type: t.type || 'weekly_payout',
                    status: t.status || 'completed',
                    date: t.date || new Date().toISOString(),
                    method: t.method || 'bank_transfer',
                    accountNumber: t.accountNumber || '****0000',
                    transactionId: t.transactionId || null,
                    trips: drv?.totalTrips || 0,
                    commission: t.commission || 0,
                    bonus: t.bonus || 0,
                    deductions: t.deductions || 0,
                    netAmount: t.netAmount || t.amount || 0,
                    paymentPeriod: t.paymentPeriod || 'N/A'
                  };
                });
                setPayments(mapped);
              }
            } catch (err) {
              setError(err.message || 'Failed to refresh');
            } finally {
              setLoading(false);
            }
          }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <IndianRupee className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(paymentSummary.totalAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{paymentSummary.completedPayments}</p>
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
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{paymentSummary.pendingPayments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Failed</p>
                <p className="text-2xl font-bold text-gray-900">{paymentSummary.failedPayments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Drivers</p>
                <p className="text-2xl font-bold text-gray-900">{paymentSummary.totalDrivers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
            <div className="flex flex-1 items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search payments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 input-field"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
              </select>

              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="input-field"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>

              <select
                name="manager"
                value={selectedManager}
                onChange={e => setSelectedManager(e.target.value)}
                className="input-field"
              >
                <option value="">All Managers</option>
                {managers.map(mgr => (
                  <option key={mgr._id} value={mgr._id}>{mgr.name}</option>
                ))}
              </select>
            </div>

            {/* Bulk Actions */}
            {selectedPayments.size > 0 && hasPermission('payments.process') && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {selectedPayments.size} selected
                </span>
                <button 
                  onClick={() => handleBulkAction('approve')}
                  className="btn btn-sm btn-success"
                >
                  Approve
                </button>
                <button 
                  onClick={() => handleBulkAction('reject')}
                  className="btn btn-sm btn-destructive"
                >
                  Reject
                </button>
                <button 
                  onClick={() => handleBulkAction('retry')}
                  className="btn btn-sm btn-primary"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardContent className="p-0">
        
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedPayments.size === filteredPayments.length && filteredPayments.length > 0}
                      onChange={selectAllPayments}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Driver
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount & Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedPayments.has(payment.id)}
                        onChange={() => togglePaymentSelection(payment.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{payment.id}</div>
                      {payment.transactionId && (
                        <div className="text-xs text-gray-500">{payment.transactionId}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">
                            {payment.driverName.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{payment.driverName}</div>
                          <div className="text-xs text-gray-500">{payment.trips} trips</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(payment.amount)}
                      </div>
                      <div className="text-xs text-gray-500">{getPaymentTypeLabel(payment.type)}</div>
                      <div className="text-xs text-gray-400">{payment.paymentPeriod}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(payment.status)}
                        {getStatusBadge(payment.status)}
                      </div>
                      {payment.status === 'failed' && payment.failureReason && (
                        <div className="text-xs text-red-500 mt-1">{payment.failureReason}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        {payment.method === 'bank_transfer' ? (
                          <CreditCard className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Wallet className="h-4 w-4 text-gray-400" />
                        )}
                        <span className="text-sm text-gray-900 capitalize">
                          {payment.method.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">{payment.accountNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(payment.date)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        {/* Process Payment Button - Only for pending/failed payments */}
                        {(payment.status === 'pending' || payment.status === 'failed') && hasPermission('payments.process') && (
                          <button
                            className="text-green-600 hover:text-green-800 disabled:opacity-50"
                            title="Process Payment"
                            disabled={processingPayment === payment.id}
                            onClick={() => handleProcessPayment(payment)}
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          className="text-red-600 hover:text-red-800"
                          title="Delete"
                          onClick={async () => {
                            if (!window.confirm('Delete this payment?')) return;
                            try {
                              const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';
                              const token = localStorage.getItem('udriver_token') || 'mock';
                              if (payment.txId) {
                                const res = await fetch(`${API_BASE}/api/transactions/${payment.txId}`, {
                                  method: 'DELETE',
                                  headers: { Authorization: `Bearer ${token}` }
                                });
                                if (!res.ok) throw new Error('Failed to delete');
                              }
                              setPayments(prev => prev.filter(p => p.id !== payment.id));
                            } catch (e) {
                              console.error(e);
                              alert('Failed to delete payment');
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            {loading && (
            <div className="p-4 text-center text-sm text-gray-600">Loading payments...</div>
          )}
          {error && (
            <div className="p-4 text-center text-sm text-red-600">{error}</div>
          )}
        </CardContent>
      </Card>

      {/* New Payment Modal */}
      {showNewPayment && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowNewPayment(false)} />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Create Payment</h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Driver</label>
                  <select
                    className="input-field w-full"
                    value={newPayment.driverId}
                    onChange={(e) => setNewPayment(p => ({ ...p, driverId: Number(e.target.value) }))}
                  >
                    <option value="">Select driver</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input type="number" className="input-field w-full" value={newPayment.amount} onChange={(e) => setNewPayment(p => ({ ...p, amount: Number(e.target.value) }))} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select className="input-field w-full" value={newPayment.type} onChange={(e) => setNewPayment(p => ({ ...p, type: e.target.value }))}>
                      <option value="weekly_payout">Weekly Payout</option>
                      <option value="bonus_payment">Bonus Payment</option>
                      <option value="incentive">Incentive</option>
                      <option value="refund">Refund</option>
                      <option value="adjustment">Adjustment</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select className="input-field w-full" value={newPayment.status} onChange={(e) => setNewPayment(p => ({ ...p, status: e.target.value }))}>
                      <option value="completed">Completed</option>
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                    <select className="input-field w-full" value={newPayment.method} onChange={(e) => setNewPayment(p => ({ ...p, method: e.target.value }))}>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="upi">UPI</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input type="date" className="input-field w-full" value={newPayment.date} onChange={(e) => setNewPayment(p => ({ ...p, date: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input type="text" className="input-field w-full" value={newPayment.description} onChange={(e) => setNewPayment(p => ({ ...p, description: e.target.value }))} />
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button className="btn btn-secondary" onClick={() => setShowNewPayment(false)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    try {
                      const API_BASE = import.meta.env.VITE_API_BASE || 'https://udrive-backend-1igb.vercel.app';
                      const token = localStorage.getItem('udriver_token') || 'mock';
                      const payload = {
                        driverId: newPayment.driverId,
                        amount: Number(newPayment.amount) || 0,
                        type: newPayment.type,
                        status: newPayment.status,
                        method: newPayment.method,
                        date: newPayment.date,
                        description: newPayment.description,
                      };
                      const res = await fetch(`${API_BASE}/api/transactions`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify(payload)
                      });
                      if (!res.ok) throw new Error(`Failed to create payment: ${res.status}`);
                      const created = await res.json();
                      const driver = drivers.find(d => d.id === created.driverId);
                      setPayments(prev => [{
                        txId: created.id || null,
                        id: created.id ? `PAY${String(1000 + created.id).slice(1)}` : (created.id || created._id),
                        driverId: created.driverId,
                        driverName: driver?.name || 'Unknown',
                        amount: created.amount || 0,
                        type: created.type || 'weekly_payout',
                        status: created.status || 'completed',
                        date: created.date || new Date().toISOString(),
                        method: created.method || 'bank_transfer',
                        accountNumber: created.accountNumber || '****0000',
                        transactionId: created.transactionId || null,
                        trips: driver?.totalTrips || 0,
                        commission: created.commission || 0,
                        bonus: created.bonus || 0,
                        deductions: created.deductions || 0,
                        netAmount: created.netAmount || created.amount || 0,
                        paymentPeriod: created.paymentPeriod || 'N/A'
                      }, ...prev]);
                      setShowNewPayment(false);
                    } catch (e) {
                      console.error(e);
                      alert('Failed to create payment');
                    }
                  }}
                  disabled={!newPayment.driverId || !newPayment.amount}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Process Payment Modal */}
      {showProcessModal && selectedPaymentForProcessing && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowProcessModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Process Payment via ZWITCH</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Real-time bank transfer for {selectedPaymentForProcessing.driverName}
                </p>
              </div>
              <div className="p-6 space-y-4">
                {/* Payment Details */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Payment Amount</span>
                    <span className="text-lg font-bold text-blue-600">
                      {formatCurrency(selectedPaymentForProcessing.amount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Payment Type</span>
                    <span className="text-sm font-medium text-gray-900">
                      {getPaymentTypeLabel(selectedPaymentForProcessing.type)}
                    </span>
                  </div>
                </div>

                {/* Bank Details Form */}
                <form id="bankDetailsForm" onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  executePayment({
                    accountNumber: formData.get('accountNumber'),
                    ifsc: formData.get('ifsc'),
                    accountHolderName: formData.get('accountHolderName')
                  });
                }}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Holder Name *
                      </label>
                      <input
                        type="text"
                        name="accountHolderName"
                        required
                        defaultValue={selectedPaymentForProcessing.driver?.accountHolderName || selectedPaymentForProcessing.driver?.name || ''}
                        className="input-field w-full"
                        placeholder="Enter account holder name"
                      />
                      {(selectedPaymentForProcessing.driver?.accountHolderName || selectedPaymentForProcessing.driver?.name) && (
                        <p className="text-xs text-green-600 mt-1">✓ Auto-filled from driver profile</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Number *
                      </label>
                      <input
                        type="text"
                        name="accountNumber"
                        required
                        pattern="[0-9]{9,18}"
                        defaultValue={selectedPaymentForProcessing.driver?.bankAccountNumber || selectedPaymentForProcessing.driver?.accountNumber || ''}
                        className="input-field w-full"
                        placeholder="Enter bank account number"
                      />
                      {(selectedPaymentForProcessing.driver?.bankAccountNumber || selectedPaymentForProcessing.driver?.accountNumber) ? (
                        <p className="text-xs text-green-600 mt-1">✓ Auto-filled from driver profile</p>
                      ) : (
                        <p className="text-xs text-gray-500 mt-1">9-18 digits</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        IFSC Code *
                      </label>
                      <input
                        type="text"
                        name="ifsc"
                        required
                        pattern="^[A-Z]{4}0[A-Z0-9]{6}$"
                        defaultValue={selectedPaymentForProcessing.driver?.ifscCode || selectedPaymentForProcessing.driver?.bankIfsc || selectedPaymentForProcessing.driver?.ifsc || ''}
                        className="input-field w-full uppercase"
                        placeholder="e.g., SBIN0001234"
                        style={{ textTransform: 'uppercase' }}
                      />
                      {(selectedPaymentForProcessing.driver?.ifscCode || selectedPaymentForProcessing.driver?.bankIfsc || selectedPaymentForProcessing.driver?.ifsc) ? (
                        <p className="text-xs text-green-600 mt-1">✓ Auto-filled from driver profile</p>
                      ) : (
                        <p className="text-xs text-gray-500 mt-1">11 characters (e.g., SBIN0001234)</p>
                      )}
                    </div>
                  </div>
                </form>

                {/* Warning */}
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
                    <div className="text-sm text-yellow-700">
                      <p className="font-medium">Important:</p>
                      <p>Please verify bank details before processing. This will initiate a real-time IMPS transfer.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setShowProcessModal(false)}
                  disabled={processingPayment}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="bankDetailsForm"
                  className="btn btn-primary"
                  disabled={processingPayment}
                >
                  {processingPayment ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Process Payment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}